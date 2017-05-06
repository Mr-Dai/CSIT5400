/** Shortcut for `v3` module of `twgl` */
const v3 = twgl.v3;
/** Shortcut for `m4` module of `twgl` */
const m4 = twgl.m4;
/** Shortcut for `primitives` module of `twgl` */
const primitives = twgl.primitives;

/** The WebGL context */
var gl;
/** The TWGL program info */
var programInfo;
/** The sphere primitive, representing the moon */
var sphere;
var stage = 0;
var projMatrix, viewMatrix;

/** The color map of the moon */
var colorMap;
/** The normal map of the moon */
var normalMap;
/** The color map of my photo */
var faceMap;
const faceHeight = 0.25;
const faceWidth = faceHeight * 225 / 225 / 2;

/** Uniform variables for shaders */
const uniforms = {};

/** Helper object for `trackball.js` */
const mouseInfo = {
    motion: false,
    pos: [0, 0],
    quat: trackball.create(0, 0, 0, 0),
    eye: [0, 0, 1000]
}

var useHeadLight = true;
/** Object containing the data of the distant light source */
const distantLight = {
    animating: false,
    startTime: 0,
    duration: 5000,
    distance: 10000,
    position: [10000, 0, 0],
    startAngle: 0,
}

/**
 * `maximizeCanvas` maximizes the canvas element associated with the given
 * WebGL context.
 */
function maximizeCanvas(gl) {
    "use strict";
    gl.canvas.width = document.body.clientWidth;
    gl.canvas.height = document.body.clientHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

/**
 * `loadShaders` loads the script element with the given id asynchronously.
 * 
 * The function uses the `src` attribute of the provided script element
 * to fetch shader source text from remote host.
 * 
 * The function returns a `Promise` instance representing the real execution, which
 * can be used to retrieve the shader source text asynchronously.
 */
function loadShader(shaderScriptID) {
    "use strict";
    return new Promise((resolve, reject) => {
        const script = document.getElementById(shaderScriptID);
        if (!script)
            reject("Failed to locate script element with id `" + shaderScriptID + "`");
        const url = script.getAttribute("src");

        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4) {
                if (this.status == 200) {
                    document.getElementById(shaderScriptID).innerHTML =
                        this.responseText;
                    console.debug("`" + url + "` loaded to `" + shaderScriptID + "`.");
                    resolve("`" + url + "` loaded to `" + shaderScriptID + "`.")
                } else {
                    console.warn("Failed to load `" + url + "`. Status code: " + this.status);
                    reject("`" + url + "` loaded to `" + shaderScriptID + "`.");
                }
            }
        }
        xhttp.open("GET", url, true);
        xhttp.send();
    });
}

function createSphereTangents(arrays, subdivisionsAxis, subdivisionsHeight) {
    /* Calculate the tangents of each sphere position */
    var numVertices = (subdivisionsAxis + 1) * (subdivisionsHeight + 1);
    var tangents = primitives.createAugmentedTypedArray(3, numVertices);
    for (var y = 0; y <= subdivisionsHeight; y++) {
        for (var x = 0; x <= subdivisionsAxis; x++) {
            var u = x / subdivisionsAxis;
            var v = y / subdivisionsHeight;
            var theta = 2 * Math.PI * u;
            var phi = Math.PI * v;
            var sinTheta = Math.sin(theta);
            var cosTheta = Math.cos(theta);
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);
            var ux = cosTheta * sinPhi;
            var uz = sinTheta * sinPhi;
            if (ux * uz < 0.001)
                tangents.push(sinTheta, 0, -cosTheta);
            else
                tangents.push(uz, 0, -ux);
        }
    }
    arrays.tangent = tangents;
}

/**
 * Initializes mouse event listener for `trackball.js`
 */
function initMouseEvents() {
    /* Set up the mouse events for the canvas area */
    gl.canvas.addEventListener('mousedown', function (event) {
        if (event.button == 0) {
            var rect = gl.canvas.getBoundingClientRect();
            mouseInfo.pos = [
                2 * (event.clientX - rect.left) / gl.canvas.width - 1,
                2 * (event.clientY - rect.top) / gl.canvas.height - 1,
            ];
            if (event.shiftKey)
                mouseInfo.motion = "pan";
            else if (event.ctrlKey)
                mouseInfo.motion = "zoom";
            else
                mouseInfo.motion = "trackball";
        }
    });
    gl.canvas.addEventListener('mouseup', function (event) {
        if (event.button == 0) mouseInfo.motion = false;
    });
    gl.canvas.addEventListener('mouseout', function (event) {
        mouseInfo.motion = false;
    });
    gl.canvas.addEventListener('mousemove', function (event) {
        if (mouseInfo.motion) {
            var rect = gl.canvas.getBoundingClientRect();
            var pos = [
                2 * (event.clientX - rect.left) / gl.canvas.width - 1,
                2 * (event.clientY - rect.top) / gl.canvas.height - 1,
            ];
            switch (mouseInfo.motion) {
                case "trackball":
                    var dq = trackball.create(
                        mouseInfo.pos[0], -mouseInfo.pos[1], pos[0], -pos[1]);
                    mouseInfo.quat = trackball.addQuats(dq, mouseInfo.quat);
                    break;
                case "pan":
                    mouseInfo.eye[0] -= (pos[0] - mouseInfo.pos[0]) * gl.canvas.width / 2;
                    mouseInfo.eye[1] += (pos[1] - mouseInfo.pos[1]) * gl.canvas.height / 2;
                    break;
                case "zoom":
                    mouseInfo.eye[2] += (pos[1] - mouseInfo.pos[1]) * gl.canvas.height / 2;
            }
            mouseInfo.pos = pos;
        }
    });
}

/**
 * Initializes key event listener
 */
function initKeyEvents() {
    /* Set up the key events */
    document.addEventListener('keydown', function (event) {
        switch (event.key) {
            case 'l':   // Switch light source
                useHeadLight = !useHeadLight;
                break;
            case ' ':   // Toggle light source animation
                if (useHeadLight) break;
                with (distantLight) {
                    animating = !animating;
                    startTime = Date.now();
                    if (!animating) {
                        startAngle = Math.acos(position[0] / distance);
                        if (position[2] > 0)
                            startAngle = 2 * Math.PI - startAngle;
                    }
                }
                break;
            case "0":   // No map
                stage = 0;
                break;
            case "1":   // Moon texture
                stage = 1;
                break;
            case "2":   // Normal map
                stage = 2;
                break;
            case "3":   // Face texture
                stage = 3;
                break;
        }
    });
}

/**
 * Setup WebGL with the given canvas ID, vertex shader script element ID
 * and fragement shader script element ID
 */
function setupWebGL(canvasID, vertexShaderID, fragmentShaderID) {
    /* Get the WebGL context */
    gl = twgl.getWebGLContext(document.getElementById(canvasID));

    /* Initialize the WebGL environment */
    if (gl) {
        gl.clearColor(0, 0, 0, 1);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        maximizeCanvas(gl);
        document.body.onresize = () => maximizeCanvas(gl);

        Promise.all([
            loadShader(vertexShaderID),
            loadShader(fragmentShaderID)
        ]).then(() => {
            /* Create the programs */
            programInfo = twgl.createProgramInfo(gl, [vertexShaderID, fragmentShaderID]);
            gl.useProgram(programInfo.program);

            /* Create the primitive */
            twgl.setDefaults({ attribPrefix: 'a_' });
            var arrays = primitives.createSphereVertices(500, 50, 50);
            createSphereTangents(arrays, 50, 50);
            sphere = twgl.createBufferInfoFromArrays(gl, arrays);

            colorMap = twgl.createTexture(gl, { src: './images/colormap.png', flipY: false });
            normalMap = twgl.createTexture(gl, { src: './images/normalmap.png', flipY: false });
            faceMap = twgl.createTexture(gl, { src: './images/me.png' });

            /* Initialize the mouse and keys */
            initMouseEvents();
            initKeyEvents();

            /* Clear the matrix stack */
            matrixstack.clear();

            /* Update the canvas content */
            window.requestAnimationFrame(render);
        });
    }
}

function setupMatrices() {
    /* Compute the current matrices */
    var modelMatrix = matrixstack.top();
    var modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);
    var normalMatrix = m4.inverse(m4.transpose(modelViewMatrix));
    var modelViewProjMatrix = m4.multiply(projMatrix, modelViewMatrix);

    /* Set up the uniforms */
    uniforms.u_ModelViewMatrix = modelViewMatrix;
    uniforms.u_NormalMatrix = normalMatrix;
    uniforms.u_ModelViewProjMatrix = modelViewProjMatrix;
}

function setupLight(ambient, color, position) {
    uniforms.u_WorldAmbient = ambient;
    uniforms.u_LightColor = color;
    uniforms.u_LightPosition = position;
}

function setupMaterial(ambient, diffuse, specular, shininess) {
    uniforms.u_MaterialAmbient = ambient;
    uniforms.u_MaterialDiffuse = diffuse;
    uniforms.u_MaterialSpecular = specular;
    uniforms.u_MaterialShininess = shininess;
}

function drawMoon() {
    matrixstack.push();

    /* Set up matrices and uniforms */
    setupMatrices();
    setupMaterial([0.8, 0.8, 0.75], [0.8, 0.8, 0.75], [0, 0, 0], 1);

    // Pass the texture
    uniforms.u_ColorMap = colorMap;
    uniforms.u_NormalMap = normalMap;
    uniforms.u_FaceMap = faceMap;
    uniforms.u_FaceHeight = faceHeight;
    uniforms.u_FaceWidth = faceWidth;

    /* Pass the current stage of the Moon to the shader */
    uniforms.u_Stage = stage;
    twgl.setUniforms(programInfo, uniforms);

    /* Draw a sphere */
    twgl.setBuffersAndAttributes(gl, programInfo, sphere);
    twgl.drawBufferInfo(gl, sphere);

    matrixstack.pop();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set up the perspective projection */
    projMatrix = m4.perspective(60 * Math.PI / 180,
        gl.canvas.width / gl.canvas.height, 0.5, 5000);

    /* Set up the viewing transformation */
    var lookAt = m4.lookAt(mouseInfo.eye, [mouseInfo.eye[0], mouseInfo.eye[1], 0], [0, 1, 0]);
    viewMatrix = m4.multiply(m4.inverse(lookAt), trackball.buildMatrix(mouseInfo.quat));

    if (useHeadLight) // Using head light: [0, 0, 0]
        setupLight([0.1, 0.1, 0.1], [1, 1, 1], [0, 0, 0]);
    else { // Using distant light source
        with (distantLight) {
            if (animating) {
                var angle = ((Date.now() - startTime) % duration) / duration * 2 * Math.PI;
                angle += startAngle;
                angle %= (2 * Math.PI);
                position = [distance * Math.cos(angle), 0, -1 * distance * Math.sin(angle)]; 
            }
            const lightEye = m4.multiply(viewMatrix, position.concat(1));
            setupLight([0.1, 0.1, 0.1], [1, 1, 1], lightEye.slice(0, 3));
        }
    }

    /* Draw the objects */
    drawMoon();

    window.requestAnimationFrame(render);
}

setupWebGL('canvas', 'vertex-shader', 'fragment-shader');
