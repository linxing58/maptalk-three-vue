import * as maptalks from "maptalks";
import * as THREE from "three";
import {  BaseObject } from 'maptalks.three'; 
import { GeoUtil } from "../geoutil/index"; 

export class LineTrip extends BaseObject {
    constructor(lineString, options, material, layer) {
        var OPTIONS = {
            chunkLength: 50,
            speed: 1,
            altitude: 0,
            interactive: false
        };
        let geoutil =new GeoUtil();
        options = maptalks.Util.extend({}, OPTIONS, options, { layer, lineString });
        super();
        //Initialize internal configuration
        // https://github.com/maptalks/maptalks.three/blob/1e45f5238f500225ada1deb09b8bab18c1b52cf2/src/BaseObject.js#L135
        this._initOptions(options);
        

        const { altitude, chunkLength, speed } = options;
        const chunkLines = geoutil.lineSlice(lineString, chunkLength);

        const centerPt = layer.coordinateToVector3(lineString.getCenter());
        //cache position for  faster computing,reduce double counting
        const positionMap = {};
        for (let i = 0, len = chunkLines.length; i < len; i++) {
            const chunkLine = chunkLines[i];
            for (let j = 0, len1 = chunkLine.length; j < len1; j++) {
                const lnglat = chunkLine[j];
                const key = lnglat.join(',').toString();
                if (!positionMap[key]) {
                    positionMap[key] = layer.coordinateToVector3(lnglat).sub(centerPt);
                }
            }
        }

        let len = 0;
        chunkLines.forEach(element => {
            len += element.length;
        });
        len *= 3;
        //generate geometry
        const result = geoutil.getChunkLinesPosition(chunkLines.slice(0, 1), layer, positionMap, centerPt);
        const positions = result.positions;
        const geometry = new THREE.BufferGeometry();
        const ps = new Float32Array(len); // 3 vertices per point
        geometry.addAttribute('position', new THREE.BufferAttribute(ps, 3).setDynamic(true));
        geoutil.setLineGeometryAttribute(geometry, positions.slice(0, 6));

        this._createLine(geometry, material);

        //set object3d position
        const z = layer.distanceToVector3(altitude, altitude).x;
        const center = lineString.getCenter();
        const v = layer.coordinateToVector3(center, z);
        this.getObject3d().position.copy(v);

        this._params = {
            index: 0,
            len: chunkLines.length,
            chunkLines,
            layer,
            speed: Math.min(1, speed),
            idx: 0,
            positions: [],
            positionMap,
            centerPt
        };
        this._init();
    }

    _init() {
        let geoutil =new GeoUtil(); 
        const { len, chunkLines, layer, positionMap, centerPt } = this._params;
        for (let i = 0; i < len; i++) {
            let ps = [];
            if (i > 0) {
                const prePs = this._params.positions[i - 1];
                for (let j = 0, len1 = prePs.length; j < len1; j++) {
                    ps.push(prePs[j]);
                }
                const nextPs = geoutil.getChunkLinesPosition([chunkLines[i]], layer, positionMap, centerPt).positions;
                for (let j = 0, len1 = nextPs.length; j < len1; j++) {
                    ps.push(nextPs[j]);
                }
            } else {
                const result = chunkLines.slice(0, i);
                ps = geoutil.getChunkLinesPosition(result, layer, positionMap, centerPt).positions;
            }
            this._params.positions[i] = ps;
        }
    }


    _animation() {
        let geoutil =new GeoUtil();
        const { index, positions, idx, speed, len, chunkLines, layer, positionMap, centerPt } = this._params;
        const i = Math.round(index);
        if (i > idx) {
            this._params.idx++;
            let ps = positions[i];
            if (!ps) {
                const result = chunkLines.slice(0, i);
                ps = geoutil.getChunkLinesPosition(result, layer, positionMap, centerPt).positions;
                this._params.positions[i] = ps;
            }
            geoutil.setLineGeometryAttribute(this.getObject3d().geometry, ps);
            this.getObject3d().geometry.attributes.position.needsUpdate = true;
        }
        if (index >= len) {
            this._params.index = -1;
            this._params.idx = -1;
        }
        this._params.index += speed;
    }
}