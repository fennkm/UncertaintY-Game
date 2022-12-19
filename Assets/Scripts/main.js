"use strict";

import * as THREE from 'three';
import { Vector3, Vector2 } from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { QuantumObject } from './QuantumObject.js'

let light, camera, debugCam, cameraHolder, controls, scene, renderer, canvas, clock;
var qCube;
var cameraRot;

const debug = false;

function main() 
{
    canvas = document.getElementById( "gl-canvas" );
    renderer = new THREE.WebGLRenderer({canvas});
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color('black');
  
    const fov = 45;
    const aspect = 2;  // the canvas default
    const near = 0.1;
    const far = 10000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.rotation.set(0, 0, 0);
    cameraRot = 0;
  
    debugCam = new THREE.PerspectiveCamera(fov, aspect, near, far);
    debugCam.position.set(0, 20, -10);

    cameraHolder = new THREE.Object3D();
    cameraHolder.position.set(0, 5, 0);

    scene.add(cameraHolder);
    cameraHolder.add(camera);
    
    createControls( debugCam );
    controls.update();

    const textureGrass = new THREE.TextureLoader().load('./Assets/Textures/Grass002_2K_Color.png');
    textureGrass.wrapS = THREE.RepeatWrapping;
    textureGrass.wrapT = THREE.RepeatWrapping;
    textureGrass.repeat.set( 10, 10 );

    const grassNormal = new THREE.TextureLoader().load('./Assets/Textures/Grass002_2K_NormalGL.png');
    grassNormal.wrapS = THREE.RepeatWrapping;
    grassNormal.wrapT = THREE.RepeatWrapping;
    grassNormal.repeat.set( 10, 10 );

    // immediately use the texture for material creation

    const PlaneGeometry = new THREE.PlaneGeometry( 1000, 1000 );
    const planeMaterial = new THREE.MeshStandardMaterial( { map: textureGrass, normalMap: grassNormal, normalScale: new Vector2(0.2, 0.2)} );
    const plane = new THREE.Mesh( PlaneGeometry, planeMaterial );
    plane.rotateX(-Math.PI/2);
    plane.receiveShadow = true;
    scene.add( plane );

    var ambLightIntensity;
    if (debug)
        ambLightIntensity = 0.5
    else
        ambLightIntensity = 0.022
    const ambLight = new THREE.AmbientLight( 0x404040, ambLightIntensity); // soft white light
    scene.add( ambLight );

    // added spotlight to enhance difference between texture and texture + normal
    light = new THREE.SpotLight( 0xddddff, 1, undefined, Math.PI / 12, 0.2);
	light.position.set(0, -1, 0);

    light.castShadow = true;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    light.shadow.camera.near = 1;
    light.shadow.camera.far = 1000;

    light.shadow.camera.fov = 120;
    light.shadow.radius = 10;
    // light.shadow.bias = 0.0001;
	camera.add(light);

    // added spotlight to enhance difference between texture and texture + normal
    const innerLight = new THREE.SpotLight( 0xffffff, 2, undefined, Math.PI / 16, 0.6);
	innerLight.position.set(0, 0, 0);
    // light.shadow.bias = 0.0001;
	light.add(innerLight);

    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, 0, -1);
    light.add(lightTarget);
    light.target = lightTarget;
    innerLight.target = lightTarget;

    const tLoader = new THREE.TextureLoader();

    // // // //adding the bump to my material
    const textureBrick =  tLoader.load('./Assets/Textures/Bricks_Terracotta.jpg')
    const AOTexture = tLoader.load('./Assets/Textures/Bricks_Terracotta_002_ambientOcclusion.jpg');
    const bumpTexture = tLoader.load('./Assets/Textures/Bricks_Terracotta_002_height.png');
    const normalTexture = tLoader.load('./Assets/Textures/Bricks_Terracotta_002_normal.jpg');
    const roughTexture = tLoader.load('./Assets/Textures/Bricks_Terracotta_002_roughness.jpg');

    const cubeMaterial = new THREE.MeshStandardMaterial({map: textureBrick, aoMap: AOTexture, roughnessMap: roughTexture, normalMap: normalTexture, bumpMap: bumpTexture});
    
    const dist = 20;
    const size = 5;
    const num = 5;

    var cubes = [];

    for (var i = 0; i < num; i++)
    {
        
        const cube = createCube(
            size, 
            dist * Math.sin(i * 2 * Math.PI / num),
            2.5,
            -dist * Math.cos(i * 2 * Math.PI / num),
            0,
            -i * Math.PI * Math.PI / num + 1,
            0
        );

        cubes.push(cube);
    }

    qCube = new QuantumObject(cubes, camera, light, Math.PI / 12);

    function createCube(size, x, y, z, rx, ry, rz)
    {
        const cubeGeo = new THREE.BoxGeometry(size, size, size);
        const cube = new THREE.Mesh(cubeGeo, cubeMaterial);
        cube.geometry.setAttribute('uv2', cube.geometry.getAttribute("uv"));
        cube.position.set(x, y, z);
        cube.rotation.set(rx, ry, rz);
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
        cubeGeo.computeBoundingBox()
        return cube;
    }

    if (debug)
    {
        scene.add(new THREE.SpotLightHelper(light));
        scene.add(new THREE.SpotLightHelper(innerLight));
        scene.add(new THREE.CameraHelper(camera));

        for (var i = 0; i < num; i++)
        {
            const arrowHelper = new THREE.ArrowHelper(new Vector3(0, 1, 0), cubes[i].position, 1);
            scene.add(arrowHelper);
        }
    }

    window.addEventListener( 'resize', onWindowResize );
    onWindowResize();

   requestAnimationFrame(render);
}


function onWindowResize()
{
    const aspect = window.innerWidth / window.innerHeight;

    camera.aspect = aspect;
    debugCam.aspect = aspect;
    camera.updateProjectionMatrix();
    debugCam.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() 
{
        controls.update();
        cameraRot -= Math.PI / 8 * clock.getDelta();
        cameraHolder.rotation.set(0, cameraRot, 0);

        qCube.update();

        // const lightPos = light.localToWorld(new Vector3(0, 0, 0));
        // const lightTargetPoss = light.target.localToWorld(new Vector3(0, 0, 0));
        // const lightToTarget = lightTargetPoss.add(lightPos.multiplyScalar(-1));
        // const arrowHelper = new THREE.ArrowHelper(lightToTarget.clone().normalize(), light.localToWorld(new Vector3(0, 0, 0)), lightToTarget.length(), 0xffff00);
        // scene.add(arrowHelper);
        
        if (debug)
            renderer.render(scene, debugCam);
        else
            renderer.render(scene, camera);

        requestAnimationFrame(render);
}


function createControls( camera ) {

    controls = new TrackballControls( camera, renderer.domElement );

    controls.rotateSpeed = 3.0;
    controls.zoomSpeed = 2;
    controls.panSpeed = 0.8;

    //     This array holds keycodes for controlling interactions.

// When the first defined key is pressed, all mouse interactions (left, middle, right) performs orbiting.
// When the second defined key is pressed, all mouse interactions (left, middle, right) performs zooming.
// When the third defined key is pressed, all mouse interactions (left, middle, right) performs panning.
// Default is KeyA, KeyS, KeyD which represents A, S, D.
    controls.keys = [ 'KeyA', 'KeyS', 'KeyD' ];



}

function getWorldPos(obj)
{
    return obj.localToWorld(new Vector3(0, 0, 0));
}

main();
