import {
	TilesRenderer,
} from '3d-tiles-renderer';
import {
	Scene,
	DirectionalLight,
	AmbientLight,
	WebGLRenderer,
	PerspectiveCamera,
	Group,
	BatchedMesh,
} from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BatchedTileManager } from './BatchedTileManager.js';
import { radixSort } from './SortUtils.js';

let camera, scene, renderer, tiles, controls, batchObject;
let offsetParent;
let infoEl;
let averageTime = 0;
let averageUpdateTime = 0;
let timeSamples = 0;

const MAX_TILES = 800;
const params = {
    useBatchedMesh: true,
	errorTarget: 5,
	minCacheSize: 600,
	coloredTiles: false,
	sortObjects: false,
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

    batchObject = new BatchedTileManager( renderer, MAX_TILES, 1800, 9000, BatchedMesh );
	batchObject.mesh.setCustomSort( function ( list, camera ) {

		// initialize options
		this._options = this._options || {
			get: el => el.z,
			aux: new Array( list.length ),
		};

		const options = this._options;
		options.reversed = this.material.transparent;

		// convert depth to unsigned 32 bit range
		const den = camera.far;
		for ( let i = 0, l = list.length; i < l; i ++ ) {

			const el = list[ i ];
			el.z = ( 1 << 30 ) * ( el.z / den );

		}

		// perform a fast-sort using the hybrid radix sort function
		radixSort( list, options );

	} );

	tiles = new TilesRenderer( 'https://raw.githubusercontent.com/NASA-AMMOS/3DTilesSampleData/master/msl-dingo-gap/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize/0528_0260184_to_s64o256_colorize_tileset.json' );
    tiles.onLoadModel = scene => {

        const [ mesh ] = scene.children;
        mesh.updateMatrix();
        batchObject.addMesh( mesh );

    };
    tiles.onDisposeModel = scene => {

        const [ mesh ] = scene.children;
        batchObject.removeMesh( mesh );

    };
    tiles.onTileVisibilityChange = ( scene, tile, value ) => {

        const [ mesh ] = scene.children;
        batchObject.setVisible( mesh, value );

    };

    tiles.group.visible = ! params.useBatchedMesh;
    batchObject.mesh.visible = params.useBatchedMesh;

    offsetParent.position.y = 0;
	offsetParent.add( batchObject.mesh, tiles.group );

    
    window.TILES = tiles;
    window.BATCH = batchObject;

	// We set camera for tileset
	tiles.setCamera( camera );
	tiles.setResolutionFromRenderer( camera, renderer );

	tiles.lruCache.maxSize = MAX_TILES;
	tiles.lruCache.minSize = 100;

    controls = new OrbitControls( camera, renderer.domElement );

	onWindowResize();
	window.addEventListener( 'resize', onWindowResize, false );

    infoEl = document.getElementById( 'info' );

	// GUI
	const gui = new GUI();
	gui.width = 300;
    gui.add( params, 'useBatchedMesh' ).onChange( v => { 

        if ( v ) {

            tiles.group.visible = false;
            batchObject.mesh.visible = true;

        } else {

            tiles.group.visible = true;
            batchObject.mesh.visible = false;

        }

        timeSamples = 0;

    } );
	gui.add( params, 'minCacheSize', 0, MAX_TILES, 1 );
	gui.add( params, 'errorTarget' , 0, 20, 0.1 );
	gui.add( params, 'coloredTiles' ).onChange( v => {

		const material = batchObject.mesh.material;
		if ( v ) {

			material.defines.COLOR_ONLY = '';

		} else {

			delete material.defines.COLOR_ONLY;

		}
		
		material.vertexColors = v;
		material.needsUpdate = true;

	} );
	gui.add( params, 'sortObjects' ).onChange( () => {

        timeSamples = 0;

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
    
	batchObject.mesh.sortObjects = params.sortObjects;

	tiles.lruCache.minSize = params.minCacheSize;
	tiles.errorTarget = params.errorTarget;

	let start, delta;
    start = window.performance.now();
	camera.updateMatrixWorld();
    tiles.group.updateMatrixWorld();
	tiles.update();
    delta = window.performance.now() - start;
    averageUpdateTime += ( delta - averageUpdateTime ) / ( timeSamples + 1 );

    start = window.performance.now();
	renderer.render( scene, camera );
    delta = window.performance.now() - start;
    averageTime += ( delta - averageTime ) / ( timeSamples + 1 );
    if ( timeSamples < 60 ) {
        
        timeSamples ++;

    }

	const totalLoaded =
		tiles.lruCache.itemList.length -
		tiles.parseQueue.items.length -
		tiles.downloadQueue.items.length;

    const { calls, triangles } = renderer.info.render;
    infoEl.innerText =
		`tiles downloading : ${ tiles.downloadQueue.items.length }\n` +
		`tiles parsing     : ${ tiles.parseQueue.items.length }\n` +
		`tiles loaded      : ${ totalLoaded }\n` +
		`tiles displayed   : ${ tiles.visibleTiles.size }\n` +
		`draw calls        : ${ calls }\n` +
        `triangles         : ${ triangles.toLocaleString() }\n` +
        `tiles update time : ${ averageUpdateTime.toFixed( 2 ) }ms\n` +
        `cpu render time   : ${ averageTime.toFixed( 2 ) }ms`;
    window.info = renderer.info;

}
