<template>
  <div id="map"></div>
</template>

<script>
import * as maptalks from "maptalks";
import * as THREE from "three";
import { ThreeLayer } from "maptalks.three";
import * as Stats from "stats.js";
import * as dat from "dat.gui";
import * as meshline from "../class/meshline/main";
import { SpriteLine } from "../class/effects/SpriteLine";
import { RippleWall } from "../class/effects/RippleWall";
import { LineTrip } from "../class/effects/LineTrip";
import { GroupGLLayer } from "@maptalks/gl";
import { GeoUtil } from "../class/geoutil/index";
// 可选的draco插件
// import '@maptalks/transcoders.draco';
// 可选的crn纹理解析插件
// import '@maptalks/transcoders.crn';
// 可选的ktx2纹理解析插件
// import '@maptalks/transcoders.ktx2';
import { Geo3DTilesLayer } from "@maptalks/3dtiles";

export default {
  name: "three",
  data() {
    return {
      stats: null,
      meshes: [],
      buidingColor: "#0fdaf5",
      OPTIONS: {
        speed: 0,
        time: 0,
      },
    };
  },
  mounted() {
    this.$nextTick(() => {
      this.mapinit();
    });
  },
  methods: {
    mapinit() {
      let map = new maptalks.Map("map", {
        center: [113.93283, 22.505497],
        zoom: 16.118,
        pitch: 60,
        // bearing: 180,
        centerCross: true,
        doubleClickZoom: false,
        // baseLayer: new maptalks.TileLayer("tile", {
        //   urlTemplate:
        //     "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        //   subdomains: ["a", "b", "c", "d"],
        //   attribution:
        //     '&copy; <a href="http://osm.org">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>',
        // }),
        baseLayer: new maptalks.TileLayer("tile", {
          // urlTemplate: "http://mt0.google.cn/vt/lyrs=m&x={x}&y={y}&z={z}",
          cssFilter: "sepia(100%) invert(95%)",
          // urlTemplate:"http://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{z}/{y}/{x}",   //geoq
          urlTemplate:
            "http://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=2&style=7", //gaode
          subdomains: [1, 2, 3, 4],
        }),
      });
      window.map = map;
      this.addToolbar();
      // the ThreeLayer to draw buildings
      var threeLayer = new ThreeLayer("threelayer", {
        identifyCountOnEvent: 1,
        forceRenderOnMoving: true,
        // forceRenderOnRotating: true
      });
      let stats;
      window.threeLayer = threeLayer;
      window.vueinstance = this;
      threeLayer.prepareToDraw = function (gl, scene, camera) {
        console.log(this);
        stats = new Stats();
        window.vueinstance.stats = stats;
        stats.domElement.style.zIndex = 100;

        document.getElementById("map").appendChild(stats.domElement);
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        camera.add(new THREE.SpotLight(0xffffff, 0.6, 0, Math.PI));
        window.vueinstance.loadBuilding();
        window.vueinstance.animation();
      };
      threeLayer.addTo(map);
    },
    addlineTrips(geojsonURL) {
      fetch(geojsonURL)
        .then(function (res) {
          return res.text();
        })
        .then(function (text) {
          return JSON.parse(text);
        })
        .then(function (geojson) {
          var geoutil = new GeoUtil();
          var lineTrips = [];
          var features = maptalks.GeoJSON.toGeometry(geojson);
          var list = [];

          features.forEach((lineString) => {
            debugger
            if (lineString.type === "LineString") {
              list.push({
                lineString,
                len: geoutil.lineLength(lineString),
              });
            } else if (lineString.type === "MultiLineString") {
              {
                var multilineString = lineString;
                multilineString._geometries.map((lineString) => {
                  list.push({
                    lineString,
                    len: geoutil.lineLength(lineString),
                  });
                });
              }
            }
          });
          list = list.sort(function (a, b) {
            return b.len - a.len;
          });
          var material = new THREE.LineBasicMaterial({
            linewidth: 1,
            color: "#00B050",
            opacity: 0.8,
            transparent: true,
          });

          var lineMaterial = new THREE.LineBasicMaterial({
            linewidth: 1,
            color: 0xd3887,
            opacity: 0.2,
            transparent: true,
          });
          var offset = 500;
          lineTrips = list.slice(0, offset).map((d) => {
            var line = new LineTrip(
              d.lineString,
              {
                chunkLength: d.len / 100,
                speed: 2,
                altitude: 2,
              },
              material,
              window.threeLayer
            );
            return line;
          });
          var line = window.threeLayer.toLines(
            list.map((l) => {
              return l.lineString;
            }),
            { interactive: false },
            lineMaterial
          );

          window.threeLayer.addMesh(line);
          window.threeLayer.addMesh(lineTrips);
        });
    },
    addToolbar() {
      var that = this;
      new maptalks.control.Toolbar({
        items: [
          {
            item: "geojson",
            click: function () {
              window.map.removeLayer(window.groupLayer);
              that.loadBuilding();
            },
          },
          {
            item: "3dtile",
            click: function () {
              window.threeLayer.removeMesh(window.meshes);
              window.threeLayer._baseObjects = [];
              window.meshes.forEach((mesh) => {
                mesh.getObject3d().geometry.dispose();
                for (const key in mesh) {
                  mesh[key] = null;
                }
                mesh = null;
              });
              window.meshes.length = 0;
              that.load3dTileset();
            },
          },
          {
            item: "ripplewall",
            click: function () {
              that.addWall();
            },
          },
          {
            item: "spriteline",
            click: function () {
              let roadtexure = require("../assets/texures/nanshan-road2.png");
              that.loadRoad("./data/nanshan-road2.geojson", roadtexure);
            },
          },
          {
            item: "lineTrip",
            click: function () {
              that.addlineTrips("./data/nanshan-road2.geojson");
            },
          },
        ],
      }).addTo(window.map);
    },
    animation() {
      // layer animation support Skipping frames
      window.threeLayer._needsUpdate = !window.threeLayer._needsUpdate;
      if (window.threeLayer._needsUpdate) {
        window.threeLayer.redraw();
      }
      this.stats.update();
      requestAnimationFrame(this.animation);
    },
    initGui() {
      var params = {
        add: true,
        altitude: 0,
        speed: this.OPTIONS.speed,
        color: this.buidingColor,
      };
      let that = this;
      var gui = new dat.GUI();
      gui.add(params, "add").onChange(function () {
        if (params.add) {
          window.threeLayer.addMesh(window.meshes);
        } else {
          window.threeLayer.removeMesh(window.meshes);
        }
      });
      gui.add(params, "speed", 0.001, 0.1, 0.001).onChange(function () {
        this.meshes.forEach(function (mesh) {
          mesh.options.speed = params.speed;
        });
      });

      gui
        .addColor(params, "color")
        .name("building color")
        .onChange(function () {
          that.buildingmaterial.topColor.set(params.color);
          window.meshs.forEach(function (mesh) {
            mesh.setSymbol(that.buildingmaterial);
          });
        });
      gui.add(params, "altitude", 0, 200).onChange(function () {
        this.meshes.forEach(function (mesh) {
          mesh.setAltitude(params.altitude);
        });
      });
    },
    loadBuilding() {
      let url = "data/nanshan-building.geojson";
      let that = this;
      fetch(url)
        .then(function (res) {
          return res.text();
        })
        .then(function (text) {
          return JSON.parse(text).features;
        })
        .then(function (features) {
          let extrudeFactor = 1;
          let meshes = [];
          for (let feature of features) {
            let height = feature.properties.height || 1;
            let material = new THREE.MeshPhongMaterial({
              color: that.getColor(height),
            });
            let extrudePolygon = window.threeLayer.toExtrudePolygon(
              maptalks.GeoJSON.toGeometry(feature),
              {
                interactive: false,
                height: extrudeFactor * height,
                topColor: that.buidingColor,
              },
              material
            );
            window.threeLayer.addMesh(extrudePolygon);
            meshes.push(extrudePolygon);
          }
          window.meshes = meshes;
        });
    },
    load3dTileset() {
      const layer = new Geo3DTilesLayer("3dtiles", {
        // offset: function (center) {
        //     const res = map.getGLRes();
        //     // 坐标由 WGS84 转为 GCJ02
        //     const c = maptalks.CRSTransform.transform(center.toArray(), 'WGS84', 'GCJ02');
        //     const coord = map.coordToPointAtRes(new maptalks.Coordinate(c), res);
        //     const offset = map.coordToPointAtRes(center, res)._sub(coord);
        //     return offset._round().toArray();
        // },
        maxGPUMemory: 512, //最大缓存数，单位 M bytes
        // loadingLimitOnInteracting : 1, //地图交互过程中瓦片请求最大数量
        // loadingLimit : 0, //瓦片请求最大数量
        services: [
          {
            //data from cesiumlab
            url: "https://earthsdk.com/v/last/Apps/assets/dayanta/tileset.json",
            // maximumScreenSpaceError值越小，加载的模型越清晰，但加载的数据量会变大
            // 清晰度可以接受的情况下，推荐把这个值设得越大越好，性能会越好
            maximumScreenSpaceError: 12.0,
            // 数据请求的额外参数
            // urlParams: 'v=0.0',
            // ajax请求的额外参数
            // ajaxOptions : { credentials : 'include' },
            // 把模型降低指定高度，单位米
            heightOffset: -400,
            // 环境光照值，倾斜摄影可以设为[1.0, 1.0, 1.0]获得最清晰的效果，非倾斜摄影可以适当降低，例如设为 [0.2, 0.2, 0.2]
            // 如果不设置，则采用地图上的默认光照值
            ambientLight: [1.0, 1.0, 1.0],
            // maxExtent: maxExtent
          },
          // 其他的3dtiles数据源
        ],
      });
      // 添加到GroupGLLayer中
      // GroupGLLayer能实现抗锯齿等后处理，也能加入其他三维图层，让子图层都融合到同一个三维空间中
      const sceneConfig = {
        postProcess: {
          enable: true,
          antialias: {
            enable: true,
          },
        },
      };
      const groupLayer = new GroupGLLayer("group", [layer], {
        sceneConfig,
      });
      groupLayer.addTo(window.map);

      window.groupLayer = groupLayer;
      layer.once("loadtileset", (e) => {
        const extent = layer.getExtent(e.index);
        window.map.fitExtent(extent, 0, { animation: false });
      });
    },
    getColor(height) {
      let rgb;
      if (height < 61.4) {
        rgb = "112,112,123";
      } else if (height >= 61.4 && height < 104.8) {
        rgb = "135,139,155";
      } else if (height >= 104.8 && height < 148.2) {
        rgb = "231,241,245";
      } else if (height >= 148.2 && height < 236) {
        rgb = "162,169,183";
      } else {
        rgb = "1,0,0";
      }
      return `rgb(${rgb})`;
    },
    loadRoad(geojsonURL, textureURL) {
      fetch(geojsonURL)
        .then(function (res) {
          return res.text();
        })
        .then(function (text) {
          return JSON.parse(text);
        })
        .then(function (geojson) {
          let texture = new THREE.TextureLoader().load(textureURL);
          texture.anisotropy = 16;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          let camera = window.threeLayer.getCamera();
          let material = new meshline.MeshLineMaterial({
            map: texture,
            useMap: true,
            lineWidth: 5,
            sizeAttenuation: false,
            transparent: true,
            near: camera.near,
            far: camera.far,
          });
          //LineStrings
          let LineStrings = maptalks.GeoJSON.toGeometry(geojson);
          LineStrings.forEach((lineString) => {
            if (lineString.type === "LineString") {
              let spriteline = new SpriteLine(
                lineString,
                {
                  speed: 0.005,
                },
                material,
                window.threeLayer
              );
              window.threeLayer.addMesh(spriteline);
            } else if (lineString.type === "MultiLineString") {
              {
                var multilineString = lineString;
                let lines = multilineString._geometries.map((lineString) => {
                  let spriteline = new SpriteLine(
                    lineString,
                    {
                      speed: 0.005,
                    },
                    material,
                    window.threeLayer
                  );
                  return spriteline;
                });
                window.threeLayer.addMesh(lines);
              }
            }
          });
        });
    },
    addWall() {
      const vertexs = {
        normal_vertex: "\n  precision lowp float;\n  precision lowp int;\n  "
          .concat(
            THREE.ShaderChunk.fog_pars_vertex,
            "\n  varying vec2 vUv;\n  void main() {\n    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n    vUv = uv;\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    "
          )
          .concat(THREE.ShaderChunk.fog_vertex, "\n  }\n"),
      };

      const fragments = {
        rippleWall_fragment:
          "\n  precision lowp float;\n  precision lowp int;\n  uniform float time;\n  uniform float opacity;\n  uniform vec3 color;\n  uniform float num;\n  uniform float hiz;\n\n  varying vec2 vUv;\n\n  void main() {\n    vec4 fragColor = vec4(0.);\n    float sin = sin((vUv.y - time * hiz) * 10. * num);\n    float high = 0.92;\n    float medium = 0.4;\n    if (sin > high) {\n      fragColor = vec4(mix(vec3(.8, 1., 1.), color, (1. - sin) / (1. - high)), 1.);\n    } else if(sin > medium) {\n      fragColor = vec4(color, mix(1., 0., 1.-(sin - medium) / (high - medium)));\n    } else {\n      fragColor = vec4(color, 0.);\n    }\n\n    vec3 fade = mix(color, vec3(0., 0., 0.), vUv.y);\n    fragColor = mix(fragColor, vec4(fade, 1.), 0.85);\n    gl_FragColor = vec4(fragColor.rgb, fragColor.a * opacity * (1. - vUv.y));\n  }\n",
      };
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: {
            type: "pv2",
            value: 0,
          },
          color: {
            type: "uvs",
            value: new THREE.Color("#00A2E8"),
          },
          opacity: {
            type: "pv2",
            value: 0.5,
          },
          num: {
            type: "pv2",
            value: 10,
          },
          hiz: {
            type: "pv2",
            value: 0.15,
          },
        },
        vertexShader: vertexs.normal_vertex,
        fragmentShader: fragments.rippleWall_fragment,
        blending: THREE.AdditiveBlending,
        transparent: !0,
        depthWrite: !1,
        depthTest: !0,
        side: THREE.DoubleSide,
      });
     
      let rippleWall = new RippleWall(
        [
          [113.928182308170875, 22.506620563904814 ], 
      [ 113.929048171344604, 22.506513996129584 ], 
      [ 113.929008208428897, 22.505248503798736 ],
       [ 113.92846204858084, 22.505155256995412 ], 
       [ 113.9279292097047, 22.505434997405388 ], 
       [ 113.928022456508032, 22.506047762112956 ], 
       [ 113.928022456508032, 22.506047762112956 ], 
       [ 113.928182308170875, 22.506620563904814 ]
        ],
        { height: 200 },
        material,
        window.threeLayer
      );
      window.threeLayer.addMesh(rippleWall);
    },
  },
};
</script>

<style scoped>
#map {
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
}
</style>
