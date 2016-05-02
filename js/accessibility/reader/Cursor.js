// Copyright 2016, University of Colorado Boulder

/**
 * Prototype for a cursor that implements the typical navigation strategies of a screen reader.  The output
 * text is meant to be read to a user by the Web Speech API synthesizer.
 *
 * NOTE: This is a prototype for screen reader behavior, and is an initial implementation for 
 * a cursor that is to be used together with the web speech API, see
 * https://github.com/phetsims/scenery/issues/538
 * 
 * @author Jesse Greenberg
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var Property = require( 'AXON/Property' );
  var scenery = require( 'SCENERY/scenery' );

  // constants
  var SPACE = ' '; // space to insert between words of text content
  var END_OF_DOCUMENT = 'END_OF_DOCUMENT'; // flag thrown when there is no more content
  var COMMA = ','; // some bits of text content should be separated with a comma for clear synth output
  var LINE_WORD_LENGTH = 15; // number of words read in a single line

  /**
   * Constructor.
   */
  function Cursor( domElement ) {

    var thisCursor = this;

    // the output utterance for the cursor, to be read by the synth and handled in various ways
    // initial output is the document title
    // @public (read-only)
    this.outputUtteranceProperty = new Property( new Utterance( document.title, 'off' ) );

    // @private - a linear representation of the DOM which is navigated by the user
    this.linearDOM = this.getLinearDOMElements( domElement );

    // @private - the active element is element that is under navigation in the parallel DOM
    this.activeElement = null;

    // @private - the active line is the current line being read and navigated with the cursor
    this.activeLine = null;

    // the letter position is the position of the cursor in the active line to support reading on a 
    // letter by letter basis.  This is relative to the length of the active line.
    // @private
    this.letterPosition = 0;

    // the wordPosition is the position in words marking the end location of the active line
    // this must be tracked to support content and descriptions longer than 15 words
    // @private
    this.wordPosition = 0;

    // we need to track the mutation observers so that they can be discconnected
    // @private
    this.observers = [];

    // track a keystate in order to handle when multiple key presses happen at once
    // @private
    this.keyState = {};

    // the document will listen for keyboard interactions
    // this listener implements common navigation strategies for a typical screen reader
    // 
    // see https://dequeuniversity.com/screenreaders/nvda-keyboard-shortcuts
    // for a list of common navigation strategies
    // 
    // TODO: Use this.keyState object instead of referencing the event directly
    document.addEventListener( 'keydown', function( event ) {

      // update the keystate object
      thisCursor.keyState[ event.keyCode ] = true;

      // store the output text here
      var outputText;

      // check to see if shift key pressed
      // TODO: we can optionally use the keyState object for this
      var shiftKeyDown = event.shiftKey;

      // the dom can change at any time, make sure that we are reading a copy that is up to date
      thisCursor.linearDOM = thisCursor.getLinearDOMElements( domElement );

      // update the list of live elements
      thisCursor.updateLiveElementList();

      // handle all of the various navigation strategies here
      if ( event.keyCode === 40 ) {
        // read the next line on 'down arrow'
        outputText = thisCursor.readNextLine();
      }
      if ( event.keyCode === 38 ) {
        // read the previous line on 'up arrow'
        outputText = thisCursor.readPreviousLine();
      }
      if ( event.keyCode === 72 ) {
        // read the previous or next headings depending on whether the shift key is pressed
        outputText = shiftKeyDown ? thisCursor.readPreviousHeading() : thisCursor.readNextHeading();
      }
      if ( event.keyCode === 9 ) {
        // let the browser naturally handle 'tab' for forms elements and elements with a tabIndex
      }
      if ( event.keyCode === 39 ) {
        // read the next character of the active line on 'right arrow'
        outputText = thisCursor.readNextCharacter();
      }
      if ( event.keyCode === 37 ) {
        // read the previous character on 'left arrow'
        outputText = thisCursor.readPreviousCharacter();
      }

      if ( thisCursor.keyState[ 45 ] && thisCursor.keyState[ 40 ] ) {
        // if insert is pressed, handle some extra behavior
        // NOTE: very unlikely that this would be used, insert is assumed to be a key with
        // screen-reader specific behavior
        outputText = thisCursor.readEntireDocument();
      }

      // if the active element is focusable, set the focus to it so that the virtual cursor can
      // directly interact with elements
      if( thisCursor.activeElement && thisCursor.isFocusable( thisCursor.activeElement ) ) {
        thisCursor.activeElement.focus();
      }

      // if the output text is a space, we want it to be read as 'blank' or 'space'
      if ( outputText === SPACE ) {
        outputText = 'space';
      }

      if ( outputText ) {
        // for now, all utterances are off for aria-live
       thisCursor.outputUtteranceProperty.set( new Utterance( outputText, 'off' ) );
      }

      // TODO: everything else in https://dequeuniversity.com/screenreaders/nvda-keyboard-shortcuts
      
    } );

    // update the keystate object on keyup to handle multiple key presses at once
    document.addEventListener( 'keyup', function( event ) {
      thisCursor.keyState[ event.keyCode ] = false;
    } );

    // listen for when an element is about to receive focus
    // we are using focusin and not focus because we want the event to bubble up to the document
    // this will handle both tab navigation and programatic focus by the simulation
    document.addEventListener( 'focusin', function( event ) {

      // anounce the new focus if it is different from the active element
      if ( event.target !== thisCursor.activeElement ) {
        thisCursor.activeElement = event.target;

        // so read out all content from aria markup since focus moved via application behavior
        var withApplicationContent = true;
        var outputText = thisCursor.getAccessibleText( this.activeElement, withApplicationContent );

        if( outputText ) {
          var liveRole = thisCursor.activeElement.getAttribute( 'aria-live' );
          thisCursor.outputUtteranceProperty.set( new Utterance( outputText, liveRole ) );
        }
      }
    } );

  }

  scenery.register( 'Cursor', Cursor );

  inherit( Object, Cursor, {

    /**
     * Get all 'element' nodes off the parent element, placing them in an array
     * for easy traversal.  Note that this includes all elements, even those
     * that are 'hidden' or purely for structure.
     * 
     * @param  {DOMElement} domElement - the parent element to linearize
     * @return {Array.<DOMElement>}
     * @private
     */
    getLinearDOMElements: function( domElement ) {
      // gets ALL descendent children for the element
      var children = domElement.getElementsByTagName( '*' );

      var linearDOM = [];
      for( var i = 0; i < children.length; i++ ) {
        if( children[i].nodeType === Node.ELEMENT_NODE ) {
          linearDOM[i] = ( children[ i ] );
        }
      }
      return linearDOM;
    },

    /**
     * Get the next element in the linearized DOM relative to the active element
     * 
     * @return {DOMElement}
     */
    getNextElement: function() {
      if ( !this.activeElement ) {
        this.activeElement = this.linearDOM[ 0 ];
      }

      var activeIndex = this.linearDOM.indexOf( this.activeElement );
      var nextIndex = activeIndex + 1;

      return this.linearDOM[ nextIndex ];
    },

    /**
     * Get the previous element in the linearized DOM relative to the active element
     * 
     * @return {DOMElement} 
     */
    getPreviousElement: function() {
      if( !this.activeElement ) {
        this.activeElement = this.linearDOM[ 0 ];
      }

      var activeIndex = this.linearDOM.indexOf( this.activeElement );
      var previousIndex = activeIndex - 1;

      return this.linearDOM[ previousIndex ];
    },

    /**
     * Get the accessible text from the element.  Depending on the navigation strategy,
     * we may or may not want to include all application content text from the markup.
     * 
     * @param  {DOMElement} element
     * @param  {boolean} withApplicationContent - do you want to include all aria text content? 
     * @return {string}             
     */
    getAccessibleText: function( element, withApplicationContent ) {

      // placeholder for the text content that we will build up from the markup
      var textContent = '';

      // if the element is undefined, we have reached the end of the document
      if ( !element ) {
        return END_OF_DOCUMENT;
      }

      // filter out structural elements that do not have accessible text
      if ( element.getAttribute( 'class' ) === 'ScreenView' ) {
        return null;
      }
      if ( element.tagName === 'HEADER' ) {
        // TODO: Headers should have some behavior
        return null;
      }
      if ( element.tagName === 'SECTION' ) {
        // TODO: What do you we do for sections? Read section + aria-labelledby?
        return null;
      }
      if ( element.getAttribute( 'aria-hidden' ) || element.hidden ) {
        return null;
      }

      // search for elements that will have content and should be read
      if ( element.tagName === 'P' ) {
        textContent += element.textContent;
      }
      if( element.tagName === 'H1' ) {
        textContent += 'Heading Level 1, ' + element.textContent;
      }
      if ( element.tagName === 'H2' ) {
        textContent += 'Heading Level 2, ' + element.textContent;
      }
      if ( element.tagName === 'H3' ) {
        textContent += 'Heading Level 3, ' + element.textContent;
      }
      if ( element.tagName === 'BUTTON' ) {
        textContent += element.textContent + ' Button';
      }
      if ( element.tagName === 'INPUT' ) {
        if ( element.type === 'reset' ) {
          textContent += element.getAttribute( 'value' ) + ' Button';
        }
        if ( element.type === 'checkbox' ) {
          var checkedString = element.checked ? ' Checked' : ' Not Checked';
          textContent += element.textContent + ' Checkbox' + checkedString;
        }
      }

      // if we are in an 'application' style of navigation, we want to add additional information
      // from the markup
      // Order of additions to textContent is important, and is designed to make sense
      // when textContent is read continuously
      // TODO: support more markup!
      if ( withApplicationContent ) {

        // insert a comma at the end of the content to enhance the output of the synth
        if ( textContent.length > 0 ) {
          textContent += COMMA;
        }

        // look for an aria-label
        var ariaLabel = element.getAttribute( 'aria-label' );
        if ( ariaLabel ) {
          textContent += SPACE + ariaLabel + COMMA;
        }

        // look for an aria-labelledBy attribute to see if there is another element in the DOM that
        // describes this one
        var ariaLabelledById = element.getAttribute( 'aria-labelledBy' );
        if ( ariaLabelledById ) {

          var ariaLabelledBy = document.getElementById( ariaLabelledById );
          var ariaLabelledByText = ariaLabelledBy.textContent;

          textContent += SPACE + ariaLabelledByText + COMMA;
        }

        // check to see if this element is draggable
        if ( element.draggable ) {
          textContent += SPACE + 'Draggable' + COMMA;
        }

        // look for aria-grabbed markup to let the user know if the element is grabbed
        if ( element.getAttribute( 'aria-grabbed' ) ) {
          textContent += SPACE + 'Grabbed' + COMMA;
        }

        // look for an element in the DOM that describes this one
        var ariaDescribedBy = element.getAttribute( 'aria-describedby' ); 
        if ( ariaDescribedBy ) {
          // the aria spec supports multiple description ID's for a single element
          var descriptionIDs = ariaDescribedBy.split( SPACE );

          var descriptionElement;
          var descriptionText;
          descriptionIDs.forEach( function( descriptionID ) {
            descriptionElement = document.getElementById( descriptionID );
            descriptionText = descriptionElement.textContent;

            textContent += SPACE + descriptionText;
          } );

        }
      }

      // delete the trailing comma if it exists at the end of the textContent
      if( textContent[ textContent.length - 1 ] === ',' ) {
        textContent = textContent.slice( 0, -1 );
      }

      return textContent;
    },

    /**
     * Get the next element in the DOM that has accessible text content, relative to the 
     * active element.
     * 
     * @return {DOMElement}
     */
    getNextElementWithAccessibleContent: function() {
      var accessibleContent;
      while( !accessibleContent ) {
        // set the selected element to the next element in the DOM
        this.activeElement = this.getNextElement();
        accessibleContent = this.getAccessibleText( this.activeElement, false );
      }

      // the active element is already set to the next element with accessible content,
      // but return it for completeness
      return this.activeElement;
    },

    /**
     * Get the previous element in the DOM that has accessible text content, relative to the 
     * active element.
     *
     * @return {DOMElement}
     */
    getPreviousElementWithAccessibleContent: function() {
      var accessibleContent;
      while ( !accessibleContent ) {
        // set the selected element to the previous element in the DOM
        this.activeElement = this.getPreviousElement();
        accessibleContent = this.getAccessibleText( this.activeElement, false );
      }

      // the active element is already set to the next element with accessible
      // content, but return it for completeness.
      return this.activeElement;
    },

    /**
     * Get the next element in the DOM with one of the specified tag names, relative to the 
     * currently active element.
     * 
     * @param  {Array.<string>} tagNames - HTML tag name
     * @return {DOMElement}
     */
    getNextElementWithTagName: function( tagNames ) {

      var element = null;

      // if there is not an active element, set to the first element in the DOM
      if ( !this.activeElement ) {
        this.activeElement = this.linearDOM[ 0 ];
      }

      // start search from the next element in the DOM
      var searchIndex = this.linearDOM.indexOf( this.activeElement ) + 1;

      // search through the remaining DOM for an element with a tagName specified
      // in tagNames
      for ( var i = searchIndex; i < this.linearDOM.length; i++ ) {
        for ( var j = 0; j < tagNames.length; j++ ) {
          if ( this.linearDOM[ i ].tagName === tagNames[ j ] ) {
            element = this.linearDOM[ i ];
            this.activeElement = element;
            break;
          }
        }
        if ( element ) {
          // go ahead and break out if we found something
          break;
        }
      }

      // we have alread set the active element to the element with the tag 
      // name but return for completeness
      return element;
    },

    /**
     * Get the previous element in the DOM
     * 
     * @param  {Array.<string>} tagNames - array of possible tag names
     * @return {DOMElement}
     */
    getPreviousElementWithTagName: function( tagNames ) {

      var element = null;

      // if there is no active element, start at the beginning of the DOM
      if ( !this.activeElement ) {
        this.activeElement = this.linearDOM[ 0 ];
      }

      // start the search at the previous element in the DOM
      var searchIndex = this.linearDOM.indexOf( this.activeElement ) - 1;

      // search backwards through the DOM for an element with a tagname
      for ( var i = searchIndex; i >= 0; i-- ) {
        for( var j = 0; j < tagNames.length; j++ ) {
          if ( this.linearDOM[ i ].tagName === tagNames[ j ] ) {
            element = this.linearDOM[ i ];
            this.activeElement = element;
            break;
          }
        }
        if ( element ) {
          // break if we have found something already
          break;
        }
      }

      return element;
    },

    /**
     * Read the next line of content from the DOM.  A line is a string of words with length
     * limitted by LINE_WORD_LENGTH.
     * 
     * @return {string}
     */
    readNextLine: function() {

      var line = '';

      // reset the content letter position because we have a new line
      this.letterPosition = 0;

      // if there is no active element, set to the next element with accessible
      // content
      if ( !this.activeElement ) {
        this.activeElement = this.getNextElementWithAccessibleContent();
      }

      // get the accessible content for the active element, without any 'application' content
      var accessibleContent = this.getAccessibleText( this.activeElement, false ).split( ' ' );

      // if the word position is at the length of the accessible content, it is time to find the next element
      if ( this.wordPosition >= accessibleContent.length ) {
        // reset the word position
        this.wordPosition = 0;

        // update the active element and set the accessible content from this element
        this.activeElement = this.getNextElementWithAccessibleContent();
        accessibleContent = this.getAccessibleText( this.activeElement, false ).split( ' ' );
      }

      // read the next line of the accessible content
      var lineLimit = this.wordPosition + LINE_WORD_LENGTH;
      for( var i = this.wordPosition; i < lineLimit; i++ ) {
        if ( accessibleContent[ i ] ) {
          line += accessibleContent[ i ];
          this.wordPosition += 1;

          if ( accessibleContent[ i + 1 ] ) {
            line += SPACE;
          }
          else { 
            // we have reached the end of this content, there are no more words
            break;
          }
        }
      }

      this.activeLine = line;
      return line;
    },

    /**
     * Read the previous line of content from the DOM.  A line is a string of words with length
     * limitted by LINE_WORD_LENGTH;
     * 
     * @return {string}
     */
    readPreviousLine: function() {

      var line = '';

      // reset the content letter position because we have a new line
      this.letterPosition = 0;

      // if there is no active element, set to the next element with accessible
      // content
      if ( !this.activeElement ) {
        this.activeElement = this.getPreviousElementWithAccessibleContent();
      }

      // get the accessible content for the active element, without any additional 'application' content
      var accessibleContent = this.getAccessibleText( this.activeElement, false ).split( ' ' );

      // if the word position is at the length of the accessible content, it is time to find the previous element
      if ( this.wordPosition >= accessibleContent.length ) {
        // reset the word position
        this.wordPosition = 0;

        // update the active element and set the accessible content from this element
        this.activeElement = this.getPreviousElementWithAccessibleContent();
        accessibleContent = this.getAccessibleText( this.activeElement, false ).split( ' ' );
      }

      // read the next line of the accessible content
      var lineLimit = this.wordPosition + LINE_WORD_LENGTH;
      for( var i = this.wordPosition; i < lineLimit; i++ ) {
        if ( accessibleContent[ i ] ) {
          line += accessibleContent[ i ];
          this.wordPosition += 1;

          if ( accessibleContent[ i + 1 ] ) {
            line += SPACE;
          }
          else { 
            // we have reached the end of this content, there are no more words
            break;
          }
        }
      }

      this.activeLine = line;
      return line;
    },

    /**
     * Read the next heading in the DOM, relative to the position of the active element.
     * 
     * @return {string}
     */
    readNextHeading: function() {
      // list of possible tags for headings
      var tagNames = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6' ];

      // get the next element in the DOM with one of the above tag names
      var nextElement = this.getNextElementWithTagName( tagNames );

      if ( !nextElement ) {
        return 'No more headings';
      }
      return this.getAccessibleText( nextElement );
    },

    /**
     * Read the previous heading in the parallel DOM, relative to the current heading.
     * 
     * @return {} [description]
     * @private
     */
    readPreviousHeading: function() {
      // list of possible tags for headings
      var tagNames = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6' ];

      // get the next element in the DOM with one of the above tag names
      var previousElement = this.getPreviousElementWithTagName( tagNames );

      if ( !previousElement ) {
        return 'No previous headings';
      }
      return this.getAccessibleText( previousElement );
    },

    /**
     * Read the next character in the currently active line.
     * 
     * @return {string}
     * @private
     */
    readNextCharacter: function() {

      // if there is no active line, find the next one
      if ( !this.activeLine ) {
        this.activeLine = this.readNextLine();
      }

      // if the we are at the end of the active line, read the next one
      if ( this.letterPosition === this.activeLine.length ) {
        this.activeLine = this.readNextLine();
      }

      // get the letter to read and increment the letter position
      var outputText = this.activeLine[ this.letterPosition ];
      this.letterPosition++;

      return outputText;
    },

    /**
     * Read the previous character in the active line.
     * 
     * @return {string}
     */
    readPreviousCharacter: function() {

      // if there is no active line, find the previous one
      if ( !this.activeLine ) {
        this.activeLine = this.readPreviousLine();
      }

      // if we are already at the begining of the line, we should go back to the previous line
      if ( this.letterPosition === 0 ) {
        this.activeLine = this.readPreviousLine();

        // since we are moving backwards through the document, we need to set the letter position to the
        // end of the active line
        this.letterPosition = this.activeLine.length;
      }

      // get the letter to read and decrement the letter position
      var outputText = this.activeLine[ this.letterPosition - 2 ];
      this.letterPosition--;

      return outputText;
    },


    /**
     * Update the list of elements, and add Mutation Observers to each one.  MutationObservers
     * provide a way to listen to changes in the DOM, see
     * https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
     *
     */
    updateLiveElementList: function() {

      var thisCursor = this;

      // remove all previous observers
      // TODO: only update the observer list if necessary
      for( var i = 0 ; i < this.observers.length; i++ ) {
        if (this.observers[ i ] ) {
          this.observers[ i ].disconnect();
        }
      }

      // clear the list of elements and observers
      this.liveElements = [];
      this.observers = [];

      // search through the DOM, looking for elements with the 'aria-live' attribute
      // TODO: additional roles should be added to this list 
      // such as 'alert' and so on
      // see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions
      for ( i = 0; i < this.linearDOM.length; i++ ) {
        var domElement = this.linearDOM[ i ];
        var liveRole = domElement.getAttribute( 'aria-live' );
        if( liveRole ) {
          thisCursor.liveElements.push( domElement );
          // scope is doing strangin things in observer callback ???
          // add to thisCursor until we figure out why
          thisCursor.liveRole = liveRole;
          // create a mutation observer for this element
          var observer = new MutationObserver( function( mutations ) {

            mutations.forEach( function( mutation ) {
              var updatedText = mutation.addedNodes[ 0 ].data;
              thisCursor.outputUtteranceProperty.set( new Utterance( updatedText, thisCursor.liveRole ) );
            } );
          } );

          // listen for changes to the subtree in case children of the aria-live parent change their textContent
          var observerConfig = { childList: true, subtree: true };

          observer.observe( domElement, observerConfig );

          thisCursor.observers.push( observer );

        }
      }
    },

    /**
     * Read continuously from the current active element
     * 
     * @return {string}
     */
    readEntireDocument: function() {
      return 'Please implement readRemainingDocument';
    },

    /**
     * Return true if the element is focusable.  A focusable element has a tab index, or is a 
     * form element.
     *
     * TODO: Populate with the rest of the focusable elements.
     * @param  {DOMElement} domElement
     * @return {Boolean}
     */
    isFocusable: function( domElement ) {
      if ( domElement.getAttribute( 'tabindex' ) || domElement.tagName === 'BUTTON' ) {
        return true;
      }
    }
  } );

  /**
   * Create an experimental type to create unique utterances for the reader.
   * Type is simply a collection of text and a priority for aria-live that
   * lets the reader know whether to queue the next utterance or cancel it in the order.
   *
   * TODO: This is where we could deviate from traditional screen reader behavior. For instance, instead of
   * just liveRole, perhaps we should have a liveIndex that specifies order of the live update? We may also
   * need additional flags here for the reader.
   *
   * @param {string} text - the text to be read as the utterance for the synth
   * @param {string} liveRole - see https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions 
   */
  function Utterance( text, liveRole ) {

    this.text = text;
    this.liveRole = liveRole;

  }

  inherit( Object, Utterance );

  return Cursor;
} );