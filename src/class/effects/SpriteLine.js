import * as maptalks from "maptalks";
import * as THREE from "three";
import { GeoUtil } from "../geoutil/index";
import * as meshline from "../meshline/main";
import {  BaseObject } from 'maptalks.three'; 
// import {  BaseObject } from 'maptalks.three'; 

export class SpriteLine extends BaseObject { 
    constructor(lineString, options, material, layer) {
        super();
        var OPTIONS = {
            // altitude: 0,
            // speed: 0.001
        };
        options.offset = material.uniforms.offset.value; 
         options.clock = new THREE.Clock();
        //geoutil.js getLinePosition
        let geoutil =new GeoUtil(); 
        const { positions } = geoutil.getLinePosition(lineString, layer);
        const positions1 = geoutil._getLinePosition(lineString, layer).positions;

        options = maptalks.Util.extend({}, OPTIONS, options, { layer, lineString, positions: positions1 }); 
        this._initOptions(options);

        const geometry = new THREE.BufferGeometry();
        const pointsArray = new Array()
        for (let i = 0; i < positions.length; i += 3) {
            pointsArray.push(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
        }
        geometry.setFromPoints(pointsArray)
        const meshLine = new meshline.MeshLine();
        meshLine.setGeometry(geometry);

        const map = layer.getMap();
        const size = map.getSize();
        const width = size.width;
        const height = size.height;
        material.uniforms.resolution.value.set(width, height);

        const line = new THREE.Mesh(meshLine.geometry, material);
        this._createGroup();
        this.getObject3d().add(line);
        const { altitude } = options;
        const z = layer.distanceToVector3(altitude, altitude).x;
        const center = lineString.getCenter();
        const v = layer.coordinateToVector3(center, z);
        this.getObject3d().position.copy(v);
    } 
    _animation() {
        this.options.offset.x += this.options.speed * this.options.clock.getDelta();
    }
}
