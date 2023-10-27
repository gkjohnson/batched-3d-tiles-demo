import {
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Box3,
	Mesh,
	MeshBasicMaterial,
	Group,
	Sphere,
    BoxGeometry,
} from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let camera, scene, renderer, tiles, controls;
let offsetParent;
let infoEl;

const params = {
    useBatchedMesh: true,
};

init();

function init() {

	scene = new Scene();

	// primary camera view
	renderer = new WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( 0xbbbbbb );

	document.body.appendChild( renderer.domElement );
	renderer.setAnimationLoop( animate );

	// create workspace
	camera = new PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 4000 );
	camera.position.set( 10, 2, 10 );
	scene.add( camera );

	// lights
	const dirLight = new DirectionalLight( 0xffffff );
	dirLight.position.set( 1, 2, 3 );
	scene.add( dirLight );

	const ambLight = new AmbientLight( 0xffffff, 0.2 );
	scene.add( ambLight );

	// parent for centering the tileset
	offsetParent = new Group();
	offsetParent.rotation.x = Math.PI / 2;
	offsetParent.position.y = 32;
	scene.add( offsetParent );

	tiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
    tiles.group.position.z = 35;
	offsetParent.add( tiles.group );

    const cube = new Mesh( new BoxGeometry() );
    scene.add( cube );
    
	// We set camera for tileset
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );

	tiles.lruCache.maxSize = 1200;
	tiles.lruCache.minSize = 900;

    controls = new OrbitControls( camera, renderer.domElement );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

    infoEl = document.getElementById( 'info' );

	// GUI
	const gui = new GUI();
	gui.width = 300;
    gui.add( params, 'useBatchedMesh' ).onChange( v => { 

        if ( v ) {

            offsetParent.remove( tiles.group );

        } else {

            offsetParent.add( tiles.group );

        }

    } );
	gui.open();

}

function onWindowResize() {

	camera.updateProjectionMatrix();
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

function animate() {
    
	tiles.update();

	// render primary view
	renderer.render( scene, camera );

    const { calls, triangles } = renderer.info.render;
    infoEl.innerText =
        `draw calls : ${ calls }\n` +
        `triangles  : ${ triangles.toLocaleString() }`;
    window.info = renderer.info;

}
