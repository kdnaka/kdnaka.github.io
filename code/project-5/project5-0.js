// This function takes the translation and two rotation angles (in radians) as input arguments.
// The two rotations are applied around x and y axes.
// It returns the combined 4x4 transformation matrix as an array in column-major order.
// You can use the MatrixMult function defined in project5.html to multiply two 4x4 matrices in the same format.
function GetModelViewMatrix( translationX, translationY, translationZ, rotationX, rotationY )
{
	// [TO-DO] Modify the code below to form the transformation matrix.
	var trans = [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		translationX, translationY, translationZ, 1
	];
	//var mvp = MatrixMult( projectionMatrix, trans );

	var rotateX = [
		1, 0, 0, 0,
		0, Math.cos(rotationX), Math.sin(rotationX), 0,
		0, -Math.sin(rotationX), Math.cos(rotationX), 0,
		0, 0, 0, 1
	];


	var rotateY = [
		Math.cos(rotationY), 0, -Math.sin(rotationY), 0,
		0, 1, 0, 0,
		Math.sin(rotationY),0,  Math.cos(rotationY), 0,
		0, 0, 0, 1
	];
	
	var rotateXY = MatrixMult(rotateX, rotateY);
	var mvp = MatrixMult(rotateXY, trans);
	//mvp = MatrixMult(rotateXY, mvp);

	return mvp;
}


// [TO-DO] Complete the implementation of the following class.

class MeshDrawer
{
	// The constructor is a good place for taking care of the necessary initializations.
	constructor()
	{
		// [TO-DO] initializations
		this.prog = InitShaderProgram( meshVS, meshFS );
		
		gl.useProgram(this.prog);

		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
		
		this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
		this.tex = gl.getUniformLocation(this.prog, 'tex');
		this.id = gl.getUniformLocation(this.prog, 'ID');
		
		this.vertexBuffer = gl.createBuffer();
		this.textureBuffer = gl.createBuffer();

		//gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
		//this.texturePosBuffer = gl.createBuffer();
		//texture pos Buffer
		
		this.show = gl.getUniformLocation(this.prog, 'show');
		
		gl.uniform1i(this.show, 0);
		//this.vertPos = gl.getAttribLocation(this.prog, 'vertPos');
		this.txc = gl.getAttribLocation(this.prog, 'txc');
	
		this.mv = gl.getUniformLocation(this.prog, 'mv');
		this.norm = gl.getUniformLocation(this.prog, 'norm');
		this.alpha = gl.getUniformLocation(this.prog, 'alpha');
		this.lpos1 = gl.getUniformLocation(this.prog, 'lpos1');
		this.lpos = gl.getUniformLocation(this.prog, 'lpos');

		this.normal = gl.getAttribLocation(this.prog, 'normal');
		this.normBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);


		var identityMatrix = [
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ];
        gl.uniformMatrix4fv(this.id, false, identityMatrix);

	}
	
	// This method is called every time the user opens an OBJ file.
	// The arguments of this function is an array of 3D vertex positions
	// and an array of 2D texture coordinates.
	// Every item in these arrays is a floating point value, representing one
	// coordinate of the vertex position or texture coordinate.
	// Every three consecutive elements in the vertPos array forms one vertex
	// position and every three consecutive vertex positions form a triangle.
	// Similarly, every two consecutive elements in the texCoords array
	// form the texture coordinate of a vertex.
	// Note that this method can be called multiple times.
	setMesh( vertPos, texCoords,normals )
	{
		gl.useProgram(this.prog);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);

		// [TO-DO] Update the contents of the vertex buffer objects.
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertPos), gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
		this.numTriangles = vertPos.length / 3;
	}
	
	// This method is called when the user changes the state of the
	// "Swap Y-Z Axes" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	swapYZ( swap )
	{
		gl.useProgram(this.prog);
		var mat = [];
		if(swap)
		{
			mat = [ 1,0,0,0,
					0,0,1,0,
					0,1,0,0,
					0,0,0,1	];
		}
		else
		{
			mat = [ 1,0,0,0,
				0,1,0,0,
				0,0,1,0,
				0,0,0,1	]; 
		}

		gl.uniformMatrix4fv(this.id, false, mat);
		// [TO-DO] Set the uniform parameter(s) of the vertex shader
	}
	
	// This method is called to draw the triangular mesh.
	// The argument is the transformation matrix, the same matrix returned
	// by the GetModelViewProjection function above.
	draw( matrixMVP, matrixMV, matrixNormal )
	{


		gl.useProgram( this.prog );
		gl.uniformMatrix4fv( this.mvp , false, matrixMVP );
		gl.uniformMatrix4fv( this.mv , false, matrixMV );
		gl.uniformMatrix3fv( this.norm , false, matrixNormal );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
		gl.enableVertexAttribArray( this.vertPos );

		gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
		gl.bindBuffer( gl.ARRAY_BUFFER, this.textureBuffer );
	
		gl.enableVertexAttribArray( this.txc );
		gl.vertexAttribPointer( this.txc, 2, gl.FLOAT, false, 0, 0 );

		gl.drawArrays( gl.TRIANGLES, 0, this.numTriangles );

		gl.bindBuffer( gl.ARRAY_BUFFER, this.normBuffer );
		
		gl.enableVertexAttribArray( this.normal );
		gl.vertexAttribPointer( this.normal, 3, gl.FLOAT, false, 0, 0 );
	}
	
	// This method is called to set the texture of the mesh.
	// The argument is an HTML IMG element containing the texture data.
	setTexture( img )
	{
		// [TO-DO] Bind the texture
		gl.useProgram(this.prog);
		gl.uniform1i(this.show, 1);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		// You can set the texture image data using the following command.
		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

		gl.generateMipmap(gl.TEXTURE_2D);

		// [TO-DO] Now that we have a texture, it might be a good idea to set
		// some uniform parameter(s) of the fragment shader, so that it uses the texture.
		gl.uniform1i(this.tex,1);
	}
	
	// This method is called when the user changes the state of the
	// "Show Texture" checkbox. 
	// The argument is a boolean that indicates if the checkbox is checked.
	showTexture( show )
	{
		gl.useProgram(this.prog)
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify if it should use the texture.
		gl.uniform1i(this.tex, 1);
		gl.activeTexture(gl.TEXTURE1);
		if(show) gl.uniform1i(this.show, 1) 
		else gl.uniform1i(this.show,0);
			


	}
	
	// This method is called to set the incoming light direction
	setLightDir( x, y, z )
	{
		gl.useProgram(this.prog);
		gl.uniform3f(this.lpos1, x, y, z);
		gl.uniform3f(this.lpos, x, y, z);
		
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the light direction.
	}
	
	// This method is called to set the shininess of the material
	setShininess( shininess )
	{
		gl.useProgram(this.prog);
		gl.uniform1f(this.alpha, shininess);
		// [TO-DO] set the uniform parameter(s) of the fragment shader to specify the shininess.
	}

}
	

var meshVS = `
	attribute vec2 txc;
	attribute vec3 pos;
	uniform mat4 mvp;
	uniform mat4 ID;

	varying vec2 texcoord;

	uniform mat4 mv;
	uniform mat3 norm;
	uniform vec3 lpos1;

	attribute vec3 normal;
	varying vec3 normals;
	varying vec3 surface;
	void main()
	{
		gl_Position = mvp * ID * vec4(pos,1);
		normals = norm*normal *mat3(ID);
		texcoord = txc;
		surface = lpos1-(mv*ID*vec4(pos,1)).xyz;
	}
`;



var meshFS = `
	precision mediump float;
	uniform sampler2D tex;
	varying vec2 texcoord;
	uniform bool show;

	uniform vec3 lpos;
	uniform float alpha;
	varying vec3 normals;
	varying vec3 surface;

	void main()
	{
		vec3 normal = normalize(normals);

		float light = max(dot(normal, normalize(lpos)), 0.0);
		vec3 halfvec = normalize(normalize(lpos)+normalize(surface));
		float specs = pow(max(dot(normal, halfvec), 0.0), alpha);
		
		if(show)
		{
			gl_FragColor =  texture2D(tex, texcoord);
			gl_FragColor.rgb *= light;
			gl_FragColor.rgb += specs;
		}else{
			gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
			gl_FragColor.rgb *= light;
			gl_FragColor.rgb += specs;
		}
	}
`;