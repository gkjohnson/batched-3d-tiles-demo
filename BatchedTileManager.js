import { BatchedMesh } from './BatchedMesh.js';
import { BufferAttribute, MeshBasicMaterial, MeshNormalMaterial, MeshStandardMaterial } from 'three';
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