import { BatchedMesh } from './BatchedMesh.js';
import { BufferAttribute, Color, DataTexture, MeshBasicMaterial, MeshNormalMaterial, PerspectiveCamera, RGBAFormat } from 'three';
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

const color = new Color();
function addColorAttribute( g, id ) {

    let attr = g.getAttribute( 'color' );
    if ( ! attr ) {

        const count = g.attributes.position.count;
        const arr = new Uint8Array( count * 3 );
        attr = new BufferAttribute( arr, 3, true );
        g.setAttribute( 'color', attr );

        color.setHSL( Math.random(), 0.5 + Math.random() * 0.3, 0.4 + Math.random() * 0.2 );

        for ( let i = 0; i < count * 3; i += 3 ) {

            arr[ i + 0 ] = color.r * 255;
            arr[ i + 1 ] = color.g * 255;
            arr[ i + 2 ] = color.b * 255;

        }

    }

}


const _camera = new PerspectiveCamera();
export class BatchedTileManager {

    constructor( renderer, maxGeometry, maxVertex, maxIndex, BatchedMeshClass = BatchedMesh ) {

        const tex = new RenderTarget2DArray( renderer, 256, 256, maxGeometry );
        const mat = new MeshBasicMaterial();
        mat.onBeforeCompile = function callback( parameters, renderer ) {

            parameters.uniforms.texture_array = { value: tex.texture };
            parameters.vertexShader = parameters.vertexShader
                .replace(
                    '#include <common>',
                    `#include <common>
                    attribute float texture_id;
                    varying float texture_index;
                    `,
                )
                .replace(
                    '#include <uv_vertex>',
                    `#include <uv_vertex>
                    ${
                        BatchedMeshClass === BatchedMesh ?
                        '' :
                        'mat4 batchingMatrix = getBatchingMatrix( batchId );'
                    }
                    texture_index = texture_id;
                    `,
                );
        
            parameters.fragmentShader = parameters.fragmentShader
                .replace(
                    '#include <map_pars_fragment>',
                    `
                    #include <map_pars_fragment>

                    precision highp sampler2DArray;
                    uniform sampler2DArray texture_array;
                    varying float texture_index;
                    `,
                )
                .replace(
                    '#include <map_fragment>',
                    `
                    #if defined( USE_MAP ) && ! defined( COLOR_ONLY )
                        diffuseColor *= texture( texture_array, vec3( vMapUv, texture_index ) );
                    #endif
                    `
                )
        
        };

        mat.map = new DataTexture( new Uint8Array( [ 255, 0, 0, 255 ] ), 1, 1, RGBAFormat );
        mat.defines = {};
        mat.map.needsUpdate = true;

        this.mesh = new BatchedMeshClass( maxGeometry, maxGeometry * maxVertex, maxGeometry * maxIndex, mat );
        this.mesh.frustumCulled = false;
        this.mesh.perObjectFrustumCulled = false;
        this.textureArray = tex;

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
            if ( attr.addUpdateRange ) {

                attr.addUpdateRange( vertexStart * itemSize, vertexCount * itemSize );

            } else {
            
                attr.updateRange.offset = vertexStart * itemSize;
                attr.updateRange.count = vertexCount * itemSize;

            }
            attr.needsUpdate = true;

        }

        if ( index.addUpdateRange ) {

            index.addUpdateRange( indexStart, indexCount );

        } else {

            index.updateRange.offset = indexStart;
            index.updateRange.count = indexCount;

        }
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
            addColorAttribute( geometry );
            batchedMesh.setGeometryAt( id, geometry );
            batchId = id;

        } else {

            const id = this._nextId ++;
            addIdAttribute( geometry, id );
            addColorAttribute( geometry );
            batchId = batchedMesh.addGeometry( geometry, maxVertex, maxIndex );

        }

        batchedMesh.setMatrixAt( batchId, mesh.matrix );
        meshToId.set( mesh, batchId );
        idToMesh.set( batchId, mesh );

        textureArray.setTextureAt( batchId, mesh.material.map );
        batchedMesh.setVisibleAt( batchId, false );

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