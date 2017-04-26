const v3 = twgl.v3;
const m4 = twgl.m4;
const primitives = twgl.primitives;

const sizeBlock = 3;

const scale = {
    head: [8, 8, 8],
    torso: [8, 12, 4],
    arm: [4, 12, 4],
    leg: [4, 12, 4],
    eye: [1, 1, 0.3],
    mouth: [2, 1, 0.3]
};

const color = {
    head: [ 170 / 255, 130 / 255, 110 / 255 ],
    torso: [ 0, 130 / 255, 130 / 255 ],
    arm: [ 110 / 255, 85 / 255, 70 / 255 ],
    leg: [ 50 / 255, 40 / 255, 120 / 255 ],
    eye: [ 1, 1, 1 ],
    eyeball: [ 70 / 255, 50 / 255, 120 / 255 ],
    mouth: [ 120 / 255, 65 / 255, 50 / 255 ]
};

const maxAngle = {
    arm: 90,
    leg: 75,
    head: 90
};

const angle = {
    head: 0,
    torso: 0,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0
};

const animation = {
    isAnimating: false,
    step: 0.1,
    current: 0,
    delta: 0.125
}

var gl;
var programInfo;
var projMatrix, viewMatrix;
var uniforms = {};

var block;

var mouseInfo = {
    motion: false,
    pos: [0, 0],
    quat: trackball.create(0, 0, 0, 0),
    eye: [0, sizeBlock * (scale.torso[1] / 2), 100]
}

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

function initKeyEvents() {
    /* Set up the key events to control the spaceship */
    document.addEventListener('keydown', function (event) {
        switch (event.key) {
            case ",": // Decrese torso angle
                angle.torso -= 5;
                if (angle.torso < 0) angle.torso += 360;
                break;
            case ".": // Increase torso angle
                angle.torso += 5;
                angle.torso %= 360;
                break;
            case "w": // Decrease head angle
                angle.head -= 5;
                if (angle.head < -maxAngle.head) angle.head = -maxAngle.head;
                break;
            case "e": // Increase head angle
                angle.head += 5;
                if (angle.head > maxAngle.head) angle.head = maxAngle.head;
                break;
            case "a": // Decrease left arm angle
                if (animation.isAnimating) break;
                angle.leftArm -= 5;
                if (angle.leftArm < -maxAngle.arm) angle.leftArm = -maxAngle.arm;
                break;
            case "s": // Increase left arm angle
                if (animation.isAnimating) break;
                angle.leftArm += 5;
                if (angle.leftArm > maxAngle.arm) angle.leftArm = maxAngle.arm;
                break;
            case "d": // Decrease right arm angle
                if (animation.isAnimating) break;
                angle.rightArm -= 5;
                if (angle.rightArm < -maxAngle.arm) angle.rightArm = -maxAngle.arm;
                break;
            case "f": // Increse right arm angle
                if (animation.isAnimating) break;
                angle.rightArm += 5;
                if (angle.rightArm > maxAngle.arm) angle.rightArm = maxAngle.arm;
                break;
            case "z": // Decrease left leg angle
                if (animation.isAnimating) break;
                angle.leftLeg -= 5;
                if (angle.leftLeg < -maxAngle.leg) angle.leftLeg = -maxAngle.leg;
                break;
            case "x": // Increase left leg angle
                if (animation.isAnimating) break;
                angle.leftLeg += 5;
                if (angle.leftLeg > maxAngle.leg) angle.leftLeg = maxAngle.leg;
                break;
            case "c": // Decrease right leg angle
                if (animation.isAnimating) break;
                angle.rightLeg -= 5;
                if (angle.rightLeg < -maxAngle.leg) angle.rightLeg = -maxAngle.leg;
                break;
            case "v": // Increse right leg angle
                if (animation.isAnimating) break;
                angle.rightLeg += 5;
                if (angle.rightLeg > maxAngle.leg) angle.rightLeg = maxAngle.leg;
                break;
            case "r": // Reset all angles
                animation.isAnimating = false;
                angle.head = 0;
                angle.leftArm = 0;
                angle.rightArm = 0;
                angle.leftLeg = 0;
                angle.rightLeg = 0;
                angle.torso = 0;
                break;
            case " ": // Toggle animation
                angle.head = 0;
                angle.leftArm = 0;
                angle.rightArm = 0;
                angle.leftLeg = 0;
                angle.rightLeg = 0;
                angle.torso = 0;
                animation.isAnimating = !animation.isAnimating;
                animation.current = 0;
                animation.delta = animation.step;
                break;
        }
    });
}

function setupMatrices() {
    // Compute the current matrices
    var modelMatrix = matrixstack.top();
    var modelViewMatrix = m4.multiply(viewMatrix, modelMatrix);
    var normalMatrix = m4.inverse(m4.transpose(modelViewMatrix));
    var modelViewProjMatrix = m4.multiply(projMatrix, modelViewMatrix);

    // Set up the uniforms
    uniforms.u_ModelViewMatrix = modelViewMatrix;
    uniforms.u_NormalMatrix = normalMatrix;
    uniforms.u_ModelViewProjMatrix = modelViewProjMatrix;
}

/**
 * `drawComponent` draws a block-like component using the given scale vector and color vector.
 */
function drawComponent(scale, color) {
    matrixstack.push();

    // Set up the model transformation
    matrixstack.multiply(m4.scaling(scale));
    matrixstack.multiply(m4.translation([0, sizeBlock / 2, 0]));

    // Set up the matrices
    setupMatrices();
    // Set the colour
    uniforms.u_Color = color;
    twgl.setUniforms(programInfo, uniforms);

    // Bind the vertext buffers
    twgl.setBuffersAndAttributes(gl, programInfo, block);
    // Draw the vertex buffers as triangles
    twgl.drawBufferInfo(gl, block);

    matrixstack.pop();
}

/**
 * `maximizeCanvas` maximizes the canvas element associated with the given
 * WebGL context.
 */
function maximizeCanvas(gl) {
    gl.canvas.width = document.body.clientWidth;
    gl.canvas.height = document.body.clientHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function renderRobot() {
    // Set up the perspective projection
    projMatrix = m4.perspective(90 * Math.PI / 180, gl.canvas.width / gl.canvas.height, 0.5, 200);

    // Set up the viewing transformation
    var lookAt = m4.lookAt(mouseInfo.eye, [mouseInfo.eye[0], mouseInfo.eye[1], 0], [0, 1, 0]);
    viewMatrix = m4.multiply(m4.inverse(lookAt), trackball.buildMatrix(mouseInfo.quat));

    // Torso
    matrixstack.push();
    matrixstack.multiply(m4.rotationY(angle.torso * Math.PI / 180));
    drawComponent(scale.torso, color.torso);


    // Left arm
    matrixstack.push();
    matrixstack.multiply(m4.translation([0, sizeBlock * (scale.arm[1] - scale.arm[0] / 2), 0]));
    matrixstack.multiply(m4.rotationX(angle.leftArm * Math.PI / 180));
    matrixstack.multiply(m4.translation([sizeBlock * (scale.torso[0] / 2 + scale.arm[0] / 2), sizeBlock * (-scale.arm[1] + scale.arm[0] / 2), 0]));
    drawComponent(scale.arm, color.arm);
    matrixstack.pop();

    // Right arm
    matrixstack.push();
    matrixstack.multiply(m4.translation([0, sizeBlock * (scale.arm[1] - scale.arm[0] / 2), 0]));
    matrixstack.multiply(m4.rotationX(angle.rightArm * Math.PI / 180));
    matrixstack.multiply(m4.translation([-1 * sizeBlock * (scale.torso[0] / 2 + scale.arm[0] / 2), sizeBlock * (-scale.arm[1] + scale.arm[0] / 2), 0]));
    drawComponent(scale.arm, color.arm);
    matrixstack.pop();


    // Left leg
    matrixstack.push();
    matrixstack.multiply(m4.rotationX(angle.leftLeg * Math.PI / 180));
    matrixstack.multiply(m4.translation([sizeBlock * (scale.torso[0] / 2 - scale.leg[0] / 2), -scale.torso[1] * sizeBlock, 0]));
    drawComponent(scale.leg, color.leg);
    matrixstack.pop();


    // Right leg
    matrixstack.push();
    matrixstack.multiply(m4.rotationX(angle.rightLeg * Math.PI / 180));
    matrixstack.multiply(m4.translation([-1 * sizeBlock * (scale.torso[0] / 2 - scale.leg[0] / 2), -scale.torso[1] * sizeBlock, 0]));
    drawComponent(scale.leg, color.leg);
    matrixstack.pop();


    // Head
    matrixstack.push();
    matrixstack.multiply(m4.rotationY(angle.head * Math.PI / 180));
    matrixstack.multiply(m4.translation([0, sizeBlock * scale.torso[1], 0]));
    drawComponent(scale.head, color.head);

    // Left eye
    matrixstack.push();
    matrixstack.multiply(m4.translation([2.5 * sizeBlock, sizeBlock * scale.head[1] / 2, sizeBlock * scale.head[2] / 2]));
    drawComponent(scale.eye, color.eye);
    matrixstack.pop();
    matrixstack.push();
    matrixstack.multiply(m4.translation([1.5 * sizeBlock, sizeBlock * scale.head[1] / 2, sizeBlock * scale.head[2] / 2]));
    drawComponent(scale.eye, color.eyeball);
    matrixstack.pop();

    // Right eye
    matrixstack.push();
    matrixstack.multiply(m4.translation([-2.5 * sizeBlock, sizeBlock * scale.head[1] / 2, sizeBlock * scale.head[2] / 2]));
    drawComponent(scale.eye, color.eye);
    matrixstack.pop();
    matrixstack.push();
    matrixstack.multiply(m4.translation([-1.5 * sizeBlock, sizeBlock * scale.head[1] / 2, sizeBlock * scale.head[2] / 2]));
    drawComponent(scale.eye, color.eyeball);
    matrixstack.pop();

    // Mouth
    matrixstack.push();
    matrixstack.multiply(m4.translation([0, sizeBlock, sizeBlock * scale.head[2] / 2]));
    drawComponent(scale.mouth, color.mouth);
    matrixstack.pop();

    // From head to torso
    matrixstack.pop();
    // From torso
    matrixstack.pop();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    maximizeCanvas(gl);

    // Change angle when animation is turned on
    if (animation.isAnimating) {
        animation.current += animation.delta;
        if (animation.current >= 1) {
            animation.current = 1;
            animation.delta = -animation.step;
        } else if (animation.current <= -1) {
            animation.current = -1;
            animation.delta = animation.step;
        }

        angle.leftArm += maxAngle.arm * animation.delta;
        angle.rightArm -= maxAngle.arm * animation.delta;
        angle.leftLeg += maxAngle.leg * animation.delta;
        angle.rightLeg -= maxAngle.leg * animation.delta;
    }

    renderRobot();    
    window.requestAnimationFrame(render);
}

function setUpWebGL(canvasID, vertexShaderID, fragementShaderID) {
    // Get the WebGL context
    gl = twgl.getWebGLContext(document.getElementById(canvasID));

    // Initialize the WebGL environment
    if (gl) {
        gl.clearColor(0, 0, 0, 1);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Create the program
        programInfo = twgl.createProgramInfo(gl, [vertexShaderID, fragementShaderID]);
        gl.useProgram(programInfo.program);

        // Create the primitive
        twgl.setDefaults({ attribPrefix: 'a_' });
        block = primitives.createCubeBufferInfo(gl, sizeBlock);
        floor = primitives.createXYQuadBufferInfo(gl, 100);

        // Initialize the mouse and keys
        initMouseEvents();
        initKeyEvents();

        // Clear the matrix stack
        matrixstack.clear();

        // Update the canvas content
        window.requestAnimationFrame(render);
    }
}

setUpWebGL("canvas", "vertex-shader", "fragment-shader");
