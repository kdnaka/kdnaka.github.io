// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// transformation matrices:
	var rotateX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		0, -1 * Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];
	var rotateY = [
		Math.cos(rotationY), 0, -1 * Math.sin(rotationY), 0,
		0, 1, 0, 0,
		Math.sin(rotationY), 0, Math.cos(rotationY), 0,
		0, 0, 0, 1
	];
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];

	// combine:
	var a = MatrixMult( rotateY, rotateX );
	var mv = MatrixMult( trans, a );
	return mv;
}


// Vertex shader source code
var meshVS = `
	precision mediump float;
	attribute vec3 pos;
	attribute vec3 nrm;
	attribute vec2 txc;
	
	uniform mat4 mvp;
	uniform mat4 mv;
	uniform mat4 swap;
	uniform mat3 nt;
	uniform vec3 light;
	
	varying vec3 view;
	varying vec3 vertNorm;
	varying vec2 texCoord;
	
	void main()
	{
		gl_Position = mvp * swap * vec4(pos,1);
		view = light - (mv * swap * vec4(pos,1)).xyz;
		vertNorm = nt * nrm;
		texCoord = txc;
	}
`;
// Fragment shader source code
var meshFS = `
	precision mediump float;
	uniform mat4 mv;
	uniform mat3 nt;
	uniform vec3 light;
	uniform float alpha;
	uniform sampler2D tex;
	uniform bool display;
	
	varying vec2 texCoord;
	varying vec3 view;
	varying vec3 vertNorm;
	
	void main()
	{
		vec3 w = normalize(light);
		vec3 n = normalize(vertNorm);
		vec3 v = normalize(view);

		float diffus = dot(n, w);
		vec3 h = normalize(w + v);
		float specul = pow(abs(dot(n, h)), alpha);
		
		gl_FragColor = display ? texture2D(tex, texCoord) : vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
		gl_FragColor.rgb *= diffus;
		gl_FragColor.rgb += specul;
	}
`;

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// WebGL initializations:
		this.prog = InitShaderProgram( meshVS, meshFS );
		
		this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
		this.vertNorm = gl.getAttribLocation( this.prog, 'nrm' );
		this.texCoord = gl.getAttribLocation( this.prog, 'txc' );
		
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
		this.mv = gl.getUniformLocation( this.prog, 'mv' );
		this.swap = gl.getUniformLocation( this.prog, 'swap' );
		this.nt = gl.getUniformLocation( this.prog, 'nt' );
		this.lightSrc = gl.getUniformLocation( this.prog, 'light' );
		this.alpha = gl.getUniformLocation( this.prog, 'alpha' );
		this.sampler = gl.getUniformLocation( this.prog, 'tex' );
		this.toggler = gl.getUniformLocation( this.prog, 'display' );
		
		// buffers:
		this.vertbuffer = gl.createBuffer();
		this.normbuffer = gl.createBuffer();
		this.texcbuffer = gl.createBuffer();

		// uniform variable(s)
		// Note: 'Show Texture' is true on startup.
		gl.useProgram( this.prog );
		var axisYZ = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
		gl.uniformMatrix4fv( this.swap, false, axisYZ );
		gl.uniform1i( this.toggler, true );
	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions,
	// an array of 2D texture coordinates, and an array of vertex normals.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex and every three consecutive 
	// elements in the normals array form a vertex normal.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords, normals )
	{
		this.numTriangles = vertPos.length / 3;
		
		// update buffer objects:
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texcbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		var axisYZ = [];
		if (swap) {
			axisYZ = [
				1, 0, 0, 0,
				0, 0, 1, 0,
				0, 1, 0, 0,
				0, 0, 0, 1
			];
		}
		else {
			axisYZ = [
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1
			];
		}
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.swap, false, axisYZ );
	}
	
	// This method is called to draw the triangular mesh.
	// The arguments are the model-view-projection transformation matrixMVP,
	// the model-view transformation matrixMV, the same matrix returned
	// by the GetModelViewProjection function above, and the normal
	// transformation matrix, which is the inverse-transpose of matrixMV.
	draw( matrixMVP, matrixMV, matrixNormal )
	{
		// complete WebGL initializations
		// set uniform parameter(s) and enable vertex shader attribute(s):
		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp, false, matrixMVP );
		gl.uniformMatrix4fv( this.mv, false, matrixMV );
		gl.uniformMatrix3fv( this.nt, false, matrixNormal );
		
		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertbuffer );
		gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertPos );
		gl.bindBuffer( gl.ARRAY_BUFFER, this.texcbuffer );
		gl.vertexAttribPointer( this.texCoord, 2, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.texCoord );
		gl.bindBuffer( gl.ARRAY_BUFFER, this.normbuffer );
		gl.vertexAttribPointer( this.vertNorm, 3, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( this.vertNorm );
		
		// draw triangle mesh:
		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		// bind texture:
		const mytex = gl.createTexture();
		gl.bindTexture( gl.TEXTURE_2D, mytex )

		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );

		// set uniform parameter(s) of the fragment shader:
		gl.generateMipmap( gl.TEXTURE_2D );
		
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, mytex );
		gl.useProgram( this.prog );
		gl.uniform1i( this.sampler, 0 );
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		gl.useProgram( this.prog );
		gl.uniform1i( this.toggler, show );
	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		gl.useProgram( this.prog );
		gl.uniform3f( this.lightSrc, x, y, z );
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		gl.useProgram( this.prog );
		gl.uniform1f( this.alpha, shininess );
	}
}
