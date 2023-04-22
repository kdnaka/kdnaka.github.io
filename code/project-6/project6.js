var raytraceFS = `
struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	HitInfo hit;
	hit.t = 0.0;
	hit.position = position;
	hit.normal = normal;
	hit.mtl = mtl;
	
	Ray r;
	r.pos = position;
	
	vec3 color = vec3(0,0,0);	
	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		
		r.dir = normalize( lights[i].position - hit.position );
		
		// checking for shadows:
		if ( !IntersectRay( hit, r ) ) {
			vec3 omega = normalize( r.dir );
			vec3 v = normalize( view );
			vec3 h = normalize( omega + v );
			color += mtl.k_d * lights[i].intensity * max( 0.0, dot( normal, r.dir ) );
			color += mtl.k_s * lights[i].intensity * pow( max( 0.0, dot( normal, r.dir ) ), mtl.n );
		}
	}
	return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	float bias = 0.00001;
	
	hit.t = 1e30;
	bool foundHit = false;
	for ( int i=0; i<NUM_SPHERES; ++i ) {
		
		// testing for ray-sphere intersection:
		vec3 pminusc = ray.pos - spheres[i].center;
		float a = dot( ray.dir, ray.dir );
		float b = 2.0 * dot( ray.dir, pminusc );
		float c = dot( pminusc, pminusc ) - (spheres[i].radius * spheres[i].radius);
		float discrim = b * b - 4.0 * a * c;
		float t1 = -1.0 * (b + sqrt(discrim)) / (2.0 * a);
		
		if ( t1 > bias )
		{
			if ( t1 < hit.t ) {  // closest intersecting sphere so far
				hit.t = t1;
				hit.position = ray.pos + t1 * ray.dir;
				hit.normal = normalize( hit.position - spheres[i].center );
				hit.mtl = spheres[i].mtl;
			}
			foundHit = true;
		}
	}
	return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;
	if ( IntersectRay( hit, ray ) ) {
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
		
		// Compute reflections
		vec3 k_s = hit.mtl.k_s;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
			
			Ray r;	// this is the reflection ray
			HitInfo h;	// reflection hit info
			
			// initializing the reflection ray:
			r.pos = hit.position;
			r.dir = normalize( (2.0 * dot( view, hit.normal ) * hit.normal) - view );
			
			float t = dot( hit.normal, -ray.dir );
			if ( IntersectRay( h, r ) ) {
				// Hit found, so shade the hit point
				// Update the loop variables for tracing the next reflection ray
				clr += k_s * Shade(h.mtl, h.position, h.normal, view);	
				k_s *= h.mtl.k_s;
				hit = h;
				view = normalize( -r.dir );
			} else {
				// The refleciton ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, r.dir.xzy ).rgb;
				break;	// no more reflections
			}
		}
		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;