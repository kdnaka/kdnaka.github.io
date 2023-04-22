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
	vec3 color = vec3(0,0,0);
	HitInfo hit;
	hit.position = position;
	hit.mtl = mtl;
	hit.normal = normal;
	hit.t = 0.0;

	for ( int i=0; i<NUM_LIGHTS; ++i ) {
		Light l = lights[i];
		vec3 diffuse = mtl.k_d;
		vec3 specular = mtl.k_s;
		vec3 lightPos = l.position;
		vec3 p = position;

		Ray ray;
		ray.pos = hit.position;
		
		vec3 lightDir = normalize(lightPos - ray.pos);
		ray.dir = lightDir;
		
		if (!IntersectRay(hit,ray))
		{
			vec3 a = normalize(ray.dir);
			vec3 b = normalize(view);
			vec3 halfvector = normalize(a+b);
			color += diffuse * l.intensity * max(dot(normal, ray.dir), 0.0);
			color += specular * l.intensity * pow(max(dot(normal, halfvector), 0.0), mtl.n);
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
	hit.t = 1e30;
	bool foundHit = false;
	for ( int i=0; i<NUM_SPHERES; ++i ) {

		Sphere s = spheres[i];
		vec3 oc = ray.pos - s.center;
		float a = dot(ray.dir, ray.dir);
		float b = 2.0 * dot(ray.dir, oc);
		float c = dot(oc, oc) - (s.radius*s.radius);
		float discriminant = b*b - 4.0*a*c;
		float t = (-b - sqrt(discriminant)) / (2.0*a);
		if (t>0.0001) 
		{
			if (t < hit.t)
			{
				hit.t = t;
				hit.mtl = s.mtl;
				hit.position = ray.pos + (ray.dir * t);
				hit.normal = normalize(hit.position - s.center);
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

	float fuzz = 0.00001;
	ray.pos += fuzz * ray.dir;
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

			r.pos = hit.position;
			float t = dot(hit.normal, -ray.dir);
			r.dir = normalize(-(view - (2.0 * dot(view, hit.normal) * hit.normal)));
			r.pos += fuzz * r.dir;

			if ( IntersectRay( h, r ) ) {
				clr += k_s * Shade(h.mtl, h.position, h.normal, view);	
				k_s *= h.mtl.k_s;
				hit = h;
				view = normalize(-r.dir);

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