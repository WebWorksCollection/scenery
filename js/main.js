// Copyright 2013-2015, University of Colorado Boulder

/**
 * Module that includes all Scenery dependencies, so that requiring this module will return an object
 * that consists of the entire exported 'scenery' namespace API.
 *
 * The API is actually generated by the 'scenery' module, so if this module (or all other modules) are
 * not included, the 'scenery' namespace may not be complete.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( [
  'SCENERY/scenery',

  'SCENERY/accessibility/AccessibleInstance',
  'SCENERY/accessibility/AccessiblePeer',
  'SCENERY/accessibility/VirtualCursor',
  'SCENERY/accessibility/reader/Cursor',
  'SCENERY/accessibility/reader/Reader',

  'SCENERY/debug/DebugContext',

  'SCENERY/display/BackboneDrawable',
  'SCENERY/display/Block',
  'SCENERY/display/CanvasBlock',
  'SCENERY/display/CanvasSelfDrawable',
  'SCENERY/display/ChangeInterval',
  'SCENERY/display/Display',
  'SCENERY/display/DOMBlock',
  'SCENERY/display/DOMSelfDrawable',
  'SCENERY/display/Drawable',
  'SCENERY/display/Fittability',
  'SCENERY/display/FittedBlock',
  'SCENERY/display/GreedyStitcher',
  'SCENERY/display/InlineCanvasCacheDrawable',
  'SCENERY/display/Instance',
  'SCENERY/display/RebuildStitcher',
  'SCENERY/display/RelativeTransform',
  'SCENERY/display/Renderer',
  'SCENERY/display/SelfDrawable',
  'SCENERY/display/SharedCanvasCacheDrawable',
  'SCENERY/display/Stitcher',
  'SCENERY/display/SVGBlock',
  'SCENERY/display/SVGGroup',
  'SCENERY/display/SVGSelfDrawable',
  'SCENERY/display/WebGLBlock',
  'SCENERY/display/WebGLSelfDrawable',

  'SCENERY/display/drawables/CanvasNodeDrawable',
  'SCENERY/display/drawables/CircleCanvasDrawable',
  'SCENERY/display/drawables/CircleDOMDrawable',
  'SCENERY/display/drawables/CircleStatefulDrawable',
  'SCENERY/display/drawables/CircleSVGDrawable',
  'SCENERY/display/drawables/DOMDrawable',
  'SCENERY/display/drawables/ImageCanvasDrawable',
  'SCENERY/display/drawables/ImageDOMDrawable',
  'SCENERY/display/drawables/ImageStatefulDrawable',
  'SCENERY/display/drawables/ImageSVGDrawable',
  'SCENERY/display/drawables/ImageWebGLDrawable',
  'SCENERY/display/drawables/LineCanvasDrawable',
  'SCENERY/display/drawables/LineStatefulDrawable',
  'SCENERY/display/drawables/LineStatelessDrawable',
  'SCENERY/display/drawables/LineSVGDrawable',
  'SCENERY/display/drawables/PathCanvasDrawable',
  'SCENERY/display/drawables/PathStatefulDrawable',
  'SCENERY/display/drawables/PathSVGDrawable',

  'SCENERY/input/BatchedDOMEvent',
  'SCENERY/input/ButtonListener',
  'SCENERY/input/DownUpListener',
  'SCENERY/input/Event',
  'SCENERY/input/Input',
  'SCENERY/input/Key',
  'SCENERY/input/Mouse',
  'SCENERY/input/Pen',
  'SCENERY/input/Pointer',
  'SCENERY/input/SimpleDragHandler',
  'SCENERY/input/Touch',

  'SCENERY/nodes/CanvasNode',
  'SCENERY/nodes/Circle',
  'SCENERY/nodes/DOM',
  'SCENERY/nodes/HBox',
  'SCENERY/nodes/HTMLText',
  'SCENERY/nodes/HStrut',
  'SCENERY/nodes/Image',
  'SCENERY/nodes/LayoutNode',
  'SCENERY/nodes/Leaf',
  'SCENERY/nodes/Line',
  'SCENERY/nodes/Node',
  'SCENERY/nodes/Paintable',
  'SCENERY/nodes/Path',
  'SCENERY/nodes/Plane',
  'SCENERY/nodes/Rectangle',
  'SCENERY/nodes/Spacer',
  'SCENERY/nodes/Text',
  'SCENERY/nodes/VBox',
  'SCENERY/nodes/VStrut',
  'SCENERY/nodes/WebGLNode',

  'SCENERY/overlays/CanvasNodeBoundsOverlay',
  'SCENERY/overlays/FittedBlockBoundsOverlay',
  'SCENERY/overlays/FocusOverlay',
  'SCENERY/overlays/PointerAreaOverlay',
  'SCENERY/overlays/PointerOverlay',

  'SCENERY/util/CanvasContextWrapper',
  'SCENERY/util/Color',
  'SCENERY/util/Features',
  'SCENERY/util/Font',
  'SCENERY/util/Gradient',
  'SCENERY/util/LinearGradient',
  'SCENERY/util/LiveRegion',
  'SCENERY/util/Pattern',
  'SCENERY/util/Picker',
  'SCENERY/util/RadialGradient',
  'SCENERY/util/RendererSummary',
  'SCENERY/util/SceneImage',
  'SCENERY/util/SceneryStyle',
  'SCENERY/util/ShaderProgram',
  'SCENERY/util/SpriteSheet',
  'SCENERY/util/Trail',
  'SCENERY/util/TrailPointer',
  'SCENERY/util/TransformTracker',
  'SCENERY/util/Util'
], function( scenery ) {
  'use strict';

  // note: we don't need any of the other parts, we just need to specify them as dependencies so they fill in the scenery namespace
  return scenery;
} );
