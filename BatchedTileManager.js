import { BatchedMesh } from './BatchedMesh.js';
import { BufferAttribute, WebGLArrayRenderTarget } from 'three';

function addIdAttribute( g, id ) {

    const count = g.attributes.position.count;
    const arr = new Uint16Array( count );
    arr.fill( id );

    const attr = new BufferAttribute( arr, 1, false );
    g.setAttribute( 'texture_id', attr );

}

export class BatchedTileManager {

    constructor( renderer, maxGeometry, maxVertex, maxIndex ) {

        this.mesh = new BatchedMesh( maxGeometry, maxVertex, maxIndex );
        this.textureArray = new WebGLArrayRenderTarget( 256, 256, maxGeometry );

        this._maxVertex = maxVertex;
        this._maxIndex = maxIndex;
        this._renderer = renderer;

        this._nextId = 0;
        this._meshToId = new Map();
        this._idToMesh = new Map();
        this._freeIds = [];

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

        let batchId;
        if ( freeIds.length === 0 ) {

            const id = freeIds.pop();
            addIdAttribute( geometry, id );
            batchedMesh.setGeometryAt( id, geometry );
            batchedMesh.setMatrixAt( id, mesh.matrix );

            batchId = id;

        } else {

            const id = this._nextId ++;
            addIdAttribute( geometry, id );
            batchId = batchedMesh.addGeometry( geometry, maxVertex, maxIndex );

        }

        meshToId.set( mesh, batchId );
        idToMesh.set( batchId, mesh );

        textureArray.setTextureAt( batchId, mesh.material.map );

        // TODO: render texture

    }

    removeMesh( mesh ) {

        const meshToId = this._meshToId;
        const idToMesh = this._idToMesh;
        const freeIds = this._freeIds;
        if ( meshToId.has( mesh ) ) {

            const id = meshToId( mesh );
            meshToId.delete( mesh );
            idToMesh.delete( id );
            freeIds.push( id );

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