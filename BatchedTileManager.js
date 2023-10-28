import { BatchedMesh } from './BatchedMesh.js';
import { BufferAttribute, MeshNormalMaterial, PerspectiveCamera } from 'three';
import { RenderTarget2DArray } from './RenderTarget2DArray.js';

function addIdAttribute( g, id ) {

    let attr = g.getAttribute( 'texture_id' );
    if ( ! attr ) {

        const count = g.attributes.position.count;
        const arr = new Uint16Array( count );
        attr = new BufferAttribute( arr, 1, false );
        g.setAttribute( 'texture_id', attr );

    }

    attr.array.fill( id );

}

const _camera = new PerspectiveCamera();
export class BatchedTileManager {

    constructor( renderer, maxGeometry, maxVertex, maxIndex ) {

        this.mesh = new BatchedMesh( maxGeometry, maxGeometry * maxVertex, maxGeometry * maxIndex, new MeshNormalMaterial() );
        this.textureArray = new RenderTarget2DArray( renderer, 256, 256, maxGeometry );

        this._maxVertex = maxVertex;
        this._maxIndex = maxIndex;
        this._renderer = renderer;

        this._nextId = 0;
        this._meshToId = new Map();
        this._idToMesh = new Map();
        this._freeIds = [];

        this._initialized = false;

    }

    _uploadGeometry( id ) {

        const renderer = this._renderer;
        const mesh = this.mesh;
        const geometry = mesh.geometry;
        const {
            vertexStart,
            vertexCount,
            indexStart,
            indexCount,
        } = mesh._reservedRanges[ id ];

        const index = geometry.index;
        const attributes = geometry.attributes;
        for ( const key in attributes ) {

            const attr = attributes[ key ];
            const itemSize = attr.itemSize;
            attr.updateRange.offset = vertexStart * itemSize;
            attr.updateRange.count = vertexCount * itemSize;
            attr.needsUpdate = true;

        }

        index.updateRange.offset = indexStart;
        index.updateRange.count = indexCount;
        index.needsUpdate = true;

        // Force an upload of the given range
        const visible = mesh.visible;
        mesh.visible = true;
        mesh.geometry.setDrawRange( 0, 3 );
        renderer.render( mesh, _camera );
        mesh.geometry.setDrawRange( 0, Infinity );
        mesh.visible = visible;

    }

    addMesh( mesh ) {

        const freeIds = this._freeIds;
        const geometry = mesh.geometry;
        const batchedMesh = this.mesh;
        const meshToId = this._meshToId;
        const idToMesh = this._idToMesh;
        const maxIndex = this._maxIndex;
        const maxVertex = this._maxVertex;
        const textureArray = this.textureArray;

        if ( meshToId.has( mesh ) ) {

            throw new Error();

        }


        let batchId;
        if ( freeIds.length > 0 ) {

            const id = freeIds.pop();
            addIdAttribute( geometry, id );
            batchedMesh.setGeometryAt( id, geometry );
            batchId = id;

        } else {

            const id = this._nextId ++;
            addIdAttribute( geometry, id );
            batchId = batchedMesh.addGeometry( geometry, maxVertex, maxIndex );

        }

        batchedMesh.setMatrixAt( batchId, mesh.matrix );
        meshToId.set( mesh, batchId );
        idToMesh.set( batchId, mesh );

        textureArray.setTextureAt( batchId, mesh.material.map );
        batchedMesh.setVisibleAt( batchId, true );

        this._uploadGeometry( batchId );

    }

    removeMesh( mesh ) {

        const meshToId = this._meshToId;
        const idToMesh = this._idToMesh;
        const freeIds = this._freeIds;
        const batchedMesh = this.mesh;
        if ( meshToId.has( mesh ) ) {

            const id = meshToId.get( mesh );
            meshToId.delete( mesh );
            idToMesh.delete( id );
            freeIds.push( id );
            batchedMesh.setVisibleAt( id, false );

        }

    }

    setVisible( mesh, visible ) {

        const meshToId = this._meshToId;
        const batchedMesh = this.mesh;
        if ( meshToId.has( mesh ) ) {

            const id = meshToId.get( mesh );
            batchedMesh.setVisibleAt( id, visible );

        }

    }

}