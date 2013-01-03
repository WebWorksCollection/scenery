
all: phet-scene.js phet-scene-min.js
	
JS_FILES= \
src/js/common.js \
src/js/model/Property.js \
src/js/model/Notifier.js \
src/js/math/Utils.js \
src/js/math/Vector2.js \
src/js/math/Vector3.js \
src/js/math/Vector4.js \
src/js/math/Matrix3.js \
src/js/math/Matrix4.js \
src/js/math/Ray3.js \
src/js/math/Transform3.js \
src/js/math/Transform4.js \
src/js/math/Permutation.js \
src/js/math/Matrix.js \
src/js/math/LUDecomposition.js \
src/js/math/QRDecomposition.js \
src/js/math/SingularValueDecomposition.js \
src/js/math/CanvasTransform.js \
src/js/math/Dimension2.js \
src/js/math/Bounds2.js \
src/js/ui/Color.js \
src/js/webgl/common.js \
src/js/webgl/GLNode.js \
src/js/webgl/Quad.js \
src/js/webgl/Sphere.js \
src/js/webgl/Cylinder.js \
src/js/canvas/common.js \
src/js/scene/common.js \
src/js/scene/Node.js \
src/js/scene/RenderState.js \
src/js/scene/nodes/Rectangle.js

phet-scene.js: concatenated.js
	java -jar bin/closure-compiler.jar --compilation_level WHITESPACE_ONLY --formatting PRETTY_PRINT --js concatenated.js --js_output_file phet-scene.js

phet-scene-min.js: concatenated.js
	java -jar bin/closure-compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --js concatenated.js --js_output_file phet-scene-min.js

concatenated.js: $(JS_FILES)
	cat $(JS_FILES) > concatenated.js

clean:
	rm -f phet-scene.js phet-scene-min.js concatenated.js

