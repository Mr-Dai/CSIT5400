precision mediump float;
precision mediump int;

// The light parameters
uniform vec3 u_WorldAmbient;
uniform vec3 u_LightColor;
uniform vec3 u_LightPosition;

// The material parameters
uniform vec3 u_MaterialAmbient;
uniform vec3 u_MaterialDiffuse;
uniform vec3 u_MaterialSpecular;
uniform float u_MaterialShininess;

// The incoming varying variables for Phong shading
varying vec3 v_Vertex;
varying vec3 v_Normal;

// ** For stage 1 onwards
// The incoming texture coordinates
varying vec2 v_TexCoord;

// ** For stage 2 onwards
// The incoming TBN matrix
varying mat3 v_TBNMatrix;

// ** For stage 1 onwards
// The texture map containing the Moon texture
uniform sampler2D u_ColorMap;

// ** For stage 2 onwards
// The texture map containing the normal map
uniform sampler2D u_NormalMap;

// ** For stage 3 onwards
// The texture map containing the face texture
uniform sampler2D u_FaceMap;
uniform float u_FaceHeight;
uniform float u_FaceWidth;

// This contains the current display stage (0, 1, 2, 3) of the Moon
uniform int u_Stage;

void main() {
    /* Find the relevant vectors for lighting calculation in eye space */
    vec3 lightDir = normalize(u_LightPosition - v_Vertex.xyz);
    vec3 viewDir = normalize(-v_Vertex.xyz);
    vec3 normal = normalize(v_Normal);

    if (u_Stage >= 2) { // Add normal adjustment
        vec3 n = vec3(texture2D(u_NormalMap, v_TexCoord).xyz) * 2.0 - 1.0;
        normal = normalize(v_TBNMatrix * n);
    }

    /* Find the ambient component */
    vec3 ambient = u_MaterialAmbient * u_WorldAmbient;

    /* Find the diffuse component */
    vec3 diffuse = vec3(0);
    float dotProduct = dot(lightDir, normal);
    if (dotProduct > 0.0) diffuse = u_MaterialDiffuse * dotProduct;

    /* Find the specular component */
    vec3 specular = vec3(0);
    if (dot(lightDir, normal) > 0.0) {
        vec3 halfVector = normalize(lightDir + viewDir);
        dotProduct = dot(halfVector, normal);
        if (dotProduct > 0.0) {
            specular = u_MaterialSpecular * pow(dotProduct, u_MaterialShininess);
        }
    }

    // Add lighting
    vec3 color = ambient + u_LightColor * (diffuse + specular);

    /* Assign the fragment colour */
    gl_FragColor = vec4(color, 1);
    if (u_Stage == 3) { // Add my photo over default texture
        float widthHalf = u_FaceWidth / 2.0;
        float heightHalf = u_FaceHeight / 2.0;
        if (v_TexCoord.x <= 0.5 + widthHalf && v_TexCoord.x >= 0.5 - widthHalf
            && v_TexCoord.y <= 0.5 + heightHalf && v_TexCoord.y >= 0.5 - heightHalf) // Render my photo
            gl_FragColor = gl_FragColor * texture2D(u_FaceMap,
                vec2((v_TexCoord.x + widthHalf - 0.5) / u_FaceWidth, (v_TexCoord.y + heightHalf - 0.5) / u_FaceHeight));
        else
            gl_FragColor = gl_FragColor * texture2D(u_ColorMap, v_TexCoord);
    } else if (u_Stage >= 1) // Add texture
        gl_FragColor = gl_FragColor * texture2D(u_ColorMap, v_TexCoord);
}
