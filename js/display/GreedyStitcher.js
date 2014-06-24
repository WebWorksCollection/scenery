// Copyright 2002-2014, University of Colorado

/**
 * Stitcher that only rebuilds the parts necessary, and attempts greedy block matching as an optimization.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';
  
  var inherit = require( 'PHET_CORE/inherit' );
  var cleanArray = require( 'PHET_CORE/cleanArray' );
  var scenery = require( 'SCENERY/scenery' );
  var Renderer = require( 'SCENERY/display/Renderer' );
  var Stitcher = require( 'SCENERY/display/Stitcher' );
  
  var prototype = {
    stitch: function( backbone, firstDrawable, lastDrawable, oldFirstDrawable, oldLastDrawable, firstChangeInterval, lastChangeInterval ) {
      this.initialize( backbone, firstDrawable, lastDrawable, oldFirstDrawable, oldLastDrawable, firstChangeInterval, lastChangeInterval );
      this.blockOrderChanged = false;
      this.reusableBlocks = cleanArray( this.reusableBlocks ); //re-use if possible
      
      var interval;
      
      // record current first/last drawables for the entire backbone
      this.recordBackboneBoundaries();
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( 'phase 1: old linked list' );
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
      
      // per-interval work
      for ( interval = firstChangeInterval; interval !== null; interval = interval.nextChangeInterval ) {
        assert && assert( !interval.isEmpty(), 'We now guarantee that the intervals are non-empty' );
        
        if ( backbone.blocks.length ) {
          //OHTWO TODO: here (in the old-iteration), we should collect references to potentially reusable blocks?
          this.noteIntervalForRemoval( backbone.display, interval, oldFirstDrawable, oldLastDrawable );
          
          var firstBlock = interval.drawableBefore === null ? backbone.blocks[0] : interval.drawableBefore.pendingParentDrawable;
          var lastBlock = interval.drawableAfter === null ? backbone.blocks[backbone.blocks.length-1] : interval.drawableAfter.pendingParentDrawable;
          
          // blocks totally contained within the change interval are marked as reusable (doesn't include end blocks)
          if ( firstBlock !== lastBlock ) {
            for ( var markedBlock = firstBlock.nextBlock; markedBlock !== lastBlock; markedBlock = markedBlock.nextBlock ) {
              markedBlock.used = false; // mark it as unused until we pull it out (so we can reuse, or quickly identify)
              this.reusableBlocks.push( markedBlock );
              this.removeBlock( markedBlock ); // remove it from our blocks array
            }
          }
        }
      }
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( 'phase 2: new linked list' );
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
      
      for ( interval = firstChangeInterval; interval !== null; interval = interval.nextChangeInterval ) {
        this.processInterval( interval );
      }
      this.cleanInterval();
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( 'phase 3: cleanup' );
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
      
      //OHTWO TODO: maintain array or linked-list of blocks (and update)
      //OHTWO TODO: remember to set blockOrderChanged on changes  (everything removed?)
      //OHTWO VERIFY: DOMBlock special case with backbones / etc.? Always have the same drawable!!!
      
      this.removeUnusedBlocks( backbone );
      
      // since we use markBeforeBlock/markAfterBlock
      this.updateBlockIntervals();
      
      if ( firstDrawable === null ) {
        this.useNoBlocks();
      } else if ( this.blockOrderChanged ) {
        this.processBlockLinkedList( backbone, firstDrawable.pendingParentDrawable, lastDrawable.pendingParentDrawable );
        this.reindex();
      }
      
      this.clean();
      cleanArray( this.reusableBlocks );
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
    },
    
    processInterval: function( interval ) {
      sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.GreedyVerbose( 'interval: ' +
                                                                          ( interval.drawableBefore ? interval.drawableBefore.toString : 'null' ) +
                                                                          ' to ' +
                                                                          ( interval.drawableAfter ? interval.drawableAfter.toString : 'null' ) );
      sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.push();
      
      this.interval = interval;
      
      // For each virtual block, once set, the drawables will be added to this block. At the start of an interval
      // if there is a block tied to the drawableBefore, we will use it. Otherwise, as we go through the drawables,
      // we attempt to match previously-used "reusable" blocks. 
      this.currentBlock = interval.drawableBefore ?
                          interval.drawableBefore.pendingParentDrawable :
                          null;
      this.previousBlock = null;
      
      // The first drawable that will be in the "range of drawables to be added to the block". This excludes the
      // "unchanged endpoint" drawables, and only includes "internal" drawables.
      this.firstDrawableForBlockChange = null;
      
      this.boundaryCount = 0;
      
      this.previousDrawable = interval.drawableBefore; // possibly null
      this.drawable = interval.drawableBefore ? interval.drawableBefore.nextDrawable : firstDrawable;
      
      for ( ; drawable !== null; drawable = drawable.nextDrawable ) {
        this.intervalStep( drawable );
      }
      
      this.intervalEnd();
      
      sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.pop();
    },
    
    cleanInterval: function() {
      this.interval = null;
      this.currentBlock = null;
      this.previousBlock = null;
      this.firstDrawableForBlockChange = null;
      this.previousDrawable = null;
      this.drawable = null;
    },
    
    intervalStep: function( drawable ) {
      sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.GreedyVerbose( 'step: ' + drawable.toString() );
      sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.push();
      if ( this.previousDrawable && this.hasGapBetweenDrawables( this.previousDrawable, drawable ) ) {
        /*---------------------------------------------------------------------------*
        * Interval boundary
        *----------------------------------------------------------------------------*/
        sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.GreedyVerbose( 'boundary' );
        sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.push();
        
        // get our final block reference, and add drawables to it
        this.currentBlock = this.addInternalDrawables( backbone, this.currentBlock, this.firstDrawableForBlockChange, this.previousDrawable );
        
        // link our blocks
        if ( boundaryCount > 0 ) {
          assert && assert( this.previousBlock, 'Should always have a previous block if this is not the first boundary' );
          assert && assert( this.firstDrawableForBlockChange && this.firstDrawableForBlockChange.previousDrawable,
                            'Should always have drawables surrounding the boundary' );
          this.linkBlocks( this.previousBlock, this.currentBlock, this.firstDrawableForBlockChange.previousDrawable, this.firstDrawableForBlockChange );
        } else if ( !this.interval.drawableBefore && this.firstDrawableForBlockChange ) {
          // we are the first block of our backbone at the start of an interval
          this.linkBlocks( null, this.currentBlock, null, this.firstDrawableForBlockChange );
        } else {
          // we are continuing in the middle of a block
        }
        
        this.previousBlock = this.currentBlock;
        this.currentBlock = null; // so we can match another
        
        boundaryCount++;
        
        sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.pop();
      }
      
      if ( drawable === this.interval.drawableAfter ) {
        // NOTE: leaves this.previousDrawable untouched, we will use it below
        sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.pop();
        break;
      } else {
        /*---------------------------------------------------------------------------*
        * Internal drawable
        *----------------------------------------------------------------------------*/
        
        // attempt to match for our block to use
        if ( this.currentBlock === null && drawable.parentDrawable && !drawable.parentDrawable.used ) {
          // mark our currentBlock to be used, but don't useBlock() it yet (we may end up gluing it at the
          // end of our interval).
          this.currentBlock = drawable.parentDrawable;
        }
        
        if ( this.firstDrawableForBlockChange === null ) {
          this.firstDrawableForBlockChange = drawable;
        }
      }
      
      // on to the next drawable
      this.previousDrawable = drawable;
      
      sceneryLog && sceneryLog.GreedyVerbose && sceneryLog.pop();
    },
    
    intervalEnd: function() {
      if ( boundaryCount === 0 && this.interval.drawableBefore && this.interval.drawableAfter &&
           this.interval.drawableBefore.pendingParentDrawable !== this.interval.drawableAfter.pendingParentDrawable ) {
        /*---------------------------------------------------------------------------*
        * Glue
        *----------------------------------------------------------------------------*/
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( 'glue' );
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
        
        //OHTWO TODO: dynamically decide which end is better to glue on
        var oldNextBlock = this.interval.drawableAfter.pendingParentDrawable;
        
        // (optional?) mark the old block as reusable
        oldNextBlock.used = false;
        this.reusableBlocks.push( oldNextBlock );
        
        assert && assert( this.currentBlock && this.currentBlock === this.interval.drawableBefore.pendingParentDrawable );
        
        this.currentBlock = this.addInternalDrawables( backbone, this.currentBlock, this.firstDrawableForBlockChange, this.previousDrawable );
        this.moveExternalDrawables( backbone, this.interval, this.currentBlock, lastDrawable );
        
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
      } else if ( boundaryCount > 0 && this.interval.drawableBefore && this.interval.drawableAfter &&
                  this.interval.drawableBefore.pendingParentDrawable === this.interval.drawableAfter.pendingParentDrawable ) {
        //OHTWO TODO: with gluing, how do we handle the if statement block?
        /*---------------------------------------------------------------------------*
        * Unglue
        *----------------------------------------------------------------------------*/
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( 'unglue' );
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
        
        var firstUngluedDrawable = this.firstDrawableForBlockChange ? this.firstDrawableForBlockChange : this.interval.drawableAfter;
        this.currentBlock = this.ensureUsedBlock( this.currentBlock, backbone, firstUngluedDrawable );
        backbone.markDirtyDrawable( this.currentBlock );
        
        // internal additions
        if ( this.firstDrawableForBlockChange ) {
          this.notePendingAdditions( backbone, this.currentBlock, firstUngluedDrawable, this.previousDrawable );
        }
        this.moveExternalDrawables( backbone, this.interval, this.currentBlock, lastDrawable );
        
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
      } else {
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( 'normal endpoint' );
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
        // handle a normal end-point, where we add our drawables to our last block
        
        // use the "after" block, if it is available
        if ( this.interval.drawableAfter ) {
          assert && assert( this.interval.drawableAfter.pendingParentDrawable );
          this.currentBlock = this.interval.drawableAfter.pendingParentDrawable;
        }
        this.currentBlock = this.addInternalDrawables( backbone, this.currentBlock, this.firstDrawableForBlockChange, this.previousDrawable );
        
        // link our blocks
        if ( boundaryCount > 0 ) {
          assert && assert( this.previousBlock, 'Should always have a previous block if this is not the first boundary' );
          assert && assert( this.firstDrawableForBlockChange && this.firstDrawableForBlockChange.previousDrawable,
                              'Should always have drawables surrounding the boundary' );
          this.linkBlocks( this.previousBlock, this.currentBlock, this.firstDrawableForBlockChange.previousDrawable, this.firstDrawableForBlockChange );
        } else if ( !this.interval.drawableBefore && this.firstDrawableForBlockChange ) {
          // we are the first block of our backbone at the start of an interval
          this.linkBlocks( null, this.currentBlock, null, this.firstDrawableForBlockChange );
        } else {
          // we are continuing in the middle of a block
        }
        
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
      }
    },
    
    noteIntervalForRemoval: function( display, interval, oldFirstDrawable, oldLastDrawable ) {
      // if before/after is null, we go out to the old first/last
      var first = interval.drawableBefore || oldFirstDrawable;
      var last = interval.drawableAfter || oldLastDrawable;
      
      for ( var drawable = first;; drawable = drawable.oldNextDrawable ) {
        this.notePendingRemoval( drawable );
        
        if ( drawable === last ) { break; }
      }
    },
    
    hasGapBetweenDrawables: function( a, b ) {
      return a.renderer !== b.renderer || Renderer.isDOM( a.renderer ) || Renderer.isDOM( b.renderer );
    },
    
    addInternalDrawables: function( backbone, currentBlock, firstDrawableForBlockChange, lastDrawableForBlockChange ) {
      if ( firstDrawableForBlockChange ) {
        currentBlock = this.ensureUsedBlock( currentBlock, backbone, firstDrawableForBlockChange );
        
        this.notePendingAdditions( backbone, currentBlock, firstDrawableForBlockChange, lastDrawableForBlockChange );
      }
      return currentBlock;
    },
    
    moveExternalDrawables: function( backbone, interval, block, lastStitchDrawable ) {
      var firstDrawable = interval.drawableAfter;
      if ( firstDrawable ) {
        var lastDrawable = lastStitchDrawable;
        while ( interval.nextChangeInterval ) {
          interval = interval.nextChangeInterval;
          if ( !interval.isEmpty() ) {
            lastDrawable = interval.drawableBefore;
            break;
          }
        }
        
        this.notePendingMoves( backbone, block, firstDrawable, lastDrawable );
      }
    },
    
    notePendingAdditions: function( backbone, block, firstDrawable, lastDrawable ) {
      for ( var drawable = firstDrawable;; drawable = drawable.nextDrawable ) {
        this.notePendingAddition( drawable, block );
        if ( drawable === lastDrawable ) { break; }
      }
    },
    
    notePendingMoves: function( backbone, block, firstDrawable, lastDrawable ) {
      for ( var drawable = firstDrawable;; drawable = drawable.nextDrawable ) {
        assert && assert( !drawable.pendingAddition && !drawable.pendingRemoval,
                          'Moved drawables should be thought of as unchanged, and thus have nothing pending yet' );
        
        this.notePendingMove( drawable, block );
        if ( drawable === lastDrawable ) { break; }
      }
    },
    
    // If there is no currentBlock, we create one to match. Otherwise if the currentBlock is marked as 'unused' (i.e.
    // it is in the reusableBlocks array), we mark it as used so it won't me matched elsewhere.
    ensureUsedBlock: function( currentBlock, backbone, someIncludedDrawable ) {
      // if we have a matched block (or started with one)
      if ( currentBlock ) {
        // since our currentBlock may be from reusableBlocks, we will need to mark it as used now.
        if ( !currentBlock.used ) {
          this.useBlock( backbone, currentBlock );
        }
      } else {
        // need to create one
        currentBlock = this.getBlockForRenderer( backbone, someIncludedDrawable.renderer, someIncludedDrawable );
      }
      return currentBlock;
    },
    
    // NOTE: this doesn't handle hooking up the block linked list
    getBlockForRenderer: function( backbone, renderer, drawable ) {
      var block;
      
      // If it's not a DOM block, scan our reusable blocks for a match
      if ( !Renderer.isDOM( renderer ) ) {
        // backwards scan, hopefully it's faster?
        for ( var i = this.reusableBlocks.length - 1; i >= 0; i-- ) {
          block = this.reusableBlocks[i];
          if ( block.renderer === renderer ) {
            this.reusableBlocks.splice( i, 1 ); // remove it from our reusable blocks, since it's now in use
            block.used = true; // mark it as used, so we don't match it when scanning
            break;
          }
        }
      }
      
      if ( !block ) {
        // Didn't find it in our reusable blocks, create a fresh one from scratch
        block = this.createBlock( renderer, drawable );
      }
      
      this.blockOrderChanged = true; // we created a new block, this will always happen
      
      return block;
    },
    
    // removes a block from the list of reused blocks (done during matching)
    useBlock: function( backbone, block ) {
      var idx = _.indexOf( this.reusableBlocks, block );
      assert && assert( idx >= 0 );
      
      // remove it
      this.reusableBlocks.splice( idx, 1 );
      
      // mark it as used
      block.used = true;
    },
    
    // removes them from our domElement, and marks them for disposal
    removeUnusedBlocks: function( backbone ) {
      sceneryLog && sceneryLog.GreedyStitcher && this.reusableBlocks.length && sceneryLog.GreedyStitcher( 'removeUnusedBlocks' );
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
      while ( this.reusableBlocks.length ) {
        this.markBlockForDisposal( this.reusableBlocks.pop() );
      }
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
    },
    
    linkBlocks: function( beforeBlock, afterBlock, beforeDrawable, afterDrawable ) {
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( 'linking blocks: ' +
                                                                            ( beforeBlock ? ( beforeBlock.toString() + ' (' + beforeDrawable.toString() + ')' ) : 'null' ) +
                                                                            ' to ' +
                                                                            ( afterBlock ? ( afterBlock.toString() + ' (' + afterDrawable.toString() + ')' ) : 'null' ) );
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
      
      assert && assert( ( beforeBlock === null && beforeDrawable === null ) ||
                        ( beforeBlock instanceof scenery.Block && beforeDrawable instanceof scenery.Drawable ) );
      assert && assert( ( afterBlock === null && afterDrawable === null ) ||
                        ( afterBlock instanceof scenery.Block && afterDrawable instanceof scenery.Drawable ) );
      
      if ( beforeBlock ) {
        if ( beforeBlock.nextBlock !== afterBlock ) {
          this.blockOrderChanged = true;
          
          // disconnect from the previously-connected block (if any)
          if ( beforeBlock.nextBlock ) {
            beforeBlock.nextBlock.previousBlock = null;
          }
          
          beforeBlock.nextBlock = afterBlock;
        }
        this.markAfterBlock( beforeBlock, beforeDrawable );
      }
      if ( afterBlock ) {
        if ( afterBlock.previousBlock !== beforeBlock ) {
          this.blockOrderChanged = true;
          
          // disconnect from the previously-connected block (if any)
          if ( afterBlock.previousBlock ) {
            afterBlock.previousBlock.nextBlock = null;
          }
          
          afterBlock.previousBlock = beforeBlock;
        }
        this.markBeforeBlock( afterBlock, afterDrawable );
      }
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
    },
    
    processBlockLinkedList: function( backbone, firstBlock, lastBlock ) {
      // for now, just clear out the array first
      while ( backbone.blocks.length ) {
        backbone.blocks.pop();
      }
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( 'processBlockLinkedList' );
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.push();
      
      // and rewrite it
      for ( var block = firstBlock;; block = block.nextBlock ) {
        sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.GreedyStitcher( block.toString() );
        
        backbone.blocks.push( block );
        
        if ( block === lastBlock ) { break; }
      }
      
      sceneryLog && sceneryLog.GreedyStitcher && sceneryLog.pop();
    }
  };
  
  var GreedyStitcher = scenery.GreedyStitcher = inherit( Stitcher, function GreedyStitcher() {
    // nothing done
  }, prototype );
  
  GreedyStitcher.stitchPrototype = prototype;
  
  return GreedyStitcher;
} );
