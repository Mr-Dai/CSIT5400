precision mediump int;

// These are the common attribute variables
attribute vec3 a_position;
attribute vec3 a_normal;

// ** For stage 1 onwards
// The incoming texture coordinates
attribute vec2 a_texcoord;

// ** For stage 2 onwards
// The incoming tangent vector
attribute vec3 a_tangent;

// The transformation matrices
uniform mat4 u_ModelViewMatrix;
uniform mat4 u_NormalMatrix;
uniform mat4 u_ModelViewProjMatrix;

// The varying variables for Phong shading
varying vec3 v_Vertex;
varying vec3 v_Normal;

// ** For stage 1 onwards
// The outgoing texture coordinates
varying vec2 v_TexCoord;

// ** For stage 2 onwards
// The outgoing TBN transformation matrix
varying mat3 v_TBNMatrix;

// This contains the current display stage (0, 1, 2, 3) of the Moon
uniform int u_Stage;

void main() {
    /* Calculate the eye coordinates */
    v_Vertex = (u_ModelViewMatrix * vec4(a_position, 1)).xyz;
    v_Normal = normalize(mat3(u_NormalMatrix) * a_normal);

    // Output the texture coordinates
    v_TexCoord = a_texcoord;

    // Computer T, B, N basis on eye coordinates
    // T = a_tangent;
    // N = a_normal;
    // B = N * T;
    vec3 T_eye = (u_ModelViewMatrix * vec4(a_tangent, 0)).xyz;
    vec3 N_eye = (u_ModelViewMatrix * vec4(a_normal, 0)).xyz;
    vec3 B_eye = (u_ModelViewMatrix * vec4(a_tangent * a_normal, 0)).xyz;
    v_TBNMatrix = mat3(T_eye, B_eye, N_eye);

    /* Output the vertex position in clip space */
    gl_Position = u_ModelViewProjMatrix * vec4(a_position, 1);
}
