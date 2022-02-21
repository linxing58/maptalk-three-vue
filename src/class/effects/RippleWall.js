import * as maptalks from "maptalks";
import * as THREE from "three";
import {  BaseObject } from 'maptalks.three'; 

export class RippleWall extends BaseObject {
    constructor(polygon, options, material, layer) {
        if (Array.isArray(polygon)) {
            polygon = new maptalks.Polygon([polygon]);
        }
        var OPTIONS = {
            altitude: 0,
            speed: 0.015,
            height: 0.01
        };
        options = maptalks.Util.extend({}, OPTIONS, options, { layer, polygon });
        super();
        //Initialize internal configuration
        // https://github.com/maptalks/maptalks.three/blob/1e45f5238f500225ada1deb09b8bab18c1b52cf2/src/BaseObject.js#L135
        this._initOptions(options);
        const { altitude, height } = options;
        //generate geometry
        //Initialize internal object3d
        // https://github.com/maptalks/maptalks.three/blob/1e45f5238f500225ada1deb09b8bab18c1b52cf2/src/BaseObject.js#L140
        const geometry = this.createGeometry(polygon, layer, height)
        this._createMesh(geometry, material);

        //set object3d position
        const z = layer.distanceToVector3(altitude, altitude).x;
        const position = layer.coordinateToVector3(polygon.getCenter(), z);
        this.getObject3d().position.copy(position);
    }


    createGeometry(polygon, layer, height) {
        height = layer.distanceToVector3(height, height).x;
        const centerPt = layer.coordinateToVector3(polygon.getCenter());
        const wall = polygon.getShell();
        const positionsV = [];
        let joinLonLat = [];
        wall.forEach(lnglat => {
            const polyPice = layer.coordinateToVector3(lnglat).sub(centerPt);
            positionsV.push(polyPice);
            joinLonLat.push(polyPice.x);
            joinLonLat.push(polyPice.y);
        });
        for (var a = joinLonLat, polySub = [], o = 0, s = 0; o < a.length - 2; o += 2, s++)
            0 === o ?
                polySub[0] = Math.sqrt((a[2] - a[0]) * (a[2] - a[0]) + (a[3] - a[1]) * (a[3] - a[1])) :
                polySub[s] = polySub[s - 1] + Math.sqrt((a[o + 2] - a[o]) * (a[o + 2] - a[o]) + (a[o + 3] - a[o + 1]) * (a[o + 3] - a[o + 1]));
        let pos = [],
            uvs = [];
        let polylenth = polySub[polySub.length - 1];
        for (let d = 0, u = pos.length, p = uvs.length; d < positionsV.length - 1; d++) {
            let pv1 = positionsV[d],
                pv2 = positionsV[d + 1],
                polyPice = polySub[d];
            pos[u++] = pv1.x,
                pos[u++] = pv1.y,
                pos[u++] = 0,
                uvs[p++] = 0 === d ? 0 : polySub[d - 1] / polylenth,
                uvs[p++] = 0,
                pos[u++] = pv2.x,
                pos[u++] = pv2.y,
                pos[u++] = 0,
                uvs[p++] = polyPice / polylenth,
                uvs[p++] = 0,
                pos[u++] = pv1.x,
                pos[u++] = pv1.y,
                pos[u++] = height,
                uvs[p++] = 0 === d ? 0 : polySub[d - 1] / polylenth,
                uvs[p++] = 1,
                pos[u++] = pv1.x,
                pos[u++] = pv1.y,
                pos[u++] = height,
                uvs[p++] = 0 === d ? 0 : polySub[d - 1] / polylenth,
                uvs[p++] = 1,
                pos[u++] = pv2.x,
                pos[u++] = pv2.y,
                pos[u++] = 0,
                uvs[p++] = polyPice / polylenth,
                uvs[p++] = 0,
                pos[u++] = pv2.x,
                pos[u++] = pv2.y,
                pos[u++] = height,
                uvs[p++] = polyPice / polylenth,
                uvs[p++] = 1
        }
        var geometry = new THREE.BufferGeometry;
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
        geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
        return geometry;
    }


    _animation() {
        const wall = this.getObject3d();
        const speed = this.getOptions().speed;
        wall.material.uniforms.time.value += speed;
    }
}