import * as log from 'loglevel';
import * as THREE from 'three'
import Vector from './vector';
import { CSG } from 'three-csg-ts';
import {BuildingModel} from './ui/buildings';

enum ModelGeneratorStates {
    WAITING,
    SUBTRACT_OCEAN,
    ADD_COASTLINE,
    SUBTRACT_RIVER,
    ADD_ROADS,
    ADD_PARKS,
    ADD_BLOCKS,
    ADD_BUILDINGS,
    CREATE_ZIP,
}

export default class ModelGenerator {
    private readonly groundLevel = 20;  // Thickness of groundMesh

    private readonly exportSTL = require('threejs-export-stl');
    private resolve: (blob: any) => void = b => {};
    private zip: any;
    private state: ModelGeneratorStates = ModelGeneratorStates.WAITING;

    private groundMesh: THREE.Mesh;
    private groundBsp: CSG;
    private polygonsToProcess: {poly: Vector[]; geometry: THREE.Geometry}[] = [];
    private minorRoadsGeometry = new THREE.Geometry();
    private majorRoadsGeometry = new THREE.Geometry();
    private mainRoadsGeometry = new THREE.Geometry();
    private blocksGeometry = new THREE.Geometry();
    private roadsBsp: CSG;
    private parksGeometry = new THREE.Geometry();
    private buildingsGeometry = new THREE.Geometry();
    private buildingsToProcess: BuildingModel[];


    constructor(private ground: Vector[],
                private sea: Vector[],
                private coastline: Vector[],
                private river: Vector[],
                private mainRoads: Vector[][],
                private majorRoads: Vector[][],
                private minorRoads: Vector[][],
                private parks: Vector[][],
                private buildings: BuildingModel[],
                private blocks: Vector[][]) {
    }

    public async getSTL(): Promise<any> {
        return new Promise<any>(resolve => {
            this.resolve = resolve;
            const JSZip = require("jszip");
            this.zip = new JSZip();
            this.zip.file("model/README.txt", "For a tutorial on putting these models together to create a city, go to https://maps.probabletrain.com/#/stl");

            this.groundMesh = this.polygonToMesh(this.ground, this.groundLevel);
            this.groundBsp = CSG.fromMesh(this.groundMesh);
            this.setState(ModelGeneratorStates.SUBTRACT_OCEAN);
        });
    }

    private setState(s: ModelGeneratorStates): void {
        this.state = s;
        log.info(ModelGeneratorStates[s]);
    }

    /**
     * Return true if processing a model
     * Work done in update loop so main thread isn't swamped
     */
    public update(): boolean {
        switch(this.state) {
            case ModelGeneratorStates.WAITING: {
                return false;
            }
            case ModelGeneratorStates.SUBTRACT_OCEAN: {
                const seaLevelMesh = this.polygonToMesh(this.ground, 0);
                this.threeToBlender(seaLevelMesh);
                const seaLevelSTL = this.exportSTL.fromMesh(seaLevelMesh);
                this.zip.file("model/domain.stl", seaLevelSTL);

                const seaMesh = this.polygonToMesh(this.sea, 0);
                this.threeToBlender(seaMesh);
                const seaMeshSTL = this.exportSTL.fromMesh(seaMesh);
                this.zip.file("model/sea.stl", seaMeshSTL);
                this.setState(ModelGeneratorStates.ADD_COASTLINE);
                break;
            }
            case ModelGeneratorStates.ADD_COASTLINE: {
                const coastlineMesh = this.polygonToMesh(this.coastline, 0);
                this.threeToBlender(coastlineMesh);
                const coastlineSTL = this.exportSTL.fromMesh(coastlineMesh);
                this.zip.file("model/coastline.stl", coastlineSTL);
                this.setState(ModelGeneratorStates.SUBTRACT_RIVER);
                break;
            }
            case ModelGeneratorStates.SUBTRACT_RIVER: {
                const riverMesh = this.polygonToMesh(this.river, 0);
                this.threeToBlender(riverMesh);
                const riverSTL = this.exportSTL.fromMesh(riverMesh);
                this.zip.file("model/river.stl", riverSTL);
                this.setState(ModelGeneratorStates.ADD_ROADS);
                this.polygonsToProcess = [];
                for (const r of this.minorRoads) this.polygonsToProcess.push({poly: r, geometry: this.minorRoadsGeometry});
                for (const r of this.majorRoads) this.polygonsToProcess.push({poly: r, geometry: this.majorRoadsGeometry});
                for (const r of this.mainRoads) this.polygonsToProcess.push({poly: r, geometry: this.mainRoadsGeometry});
                break;
            }
            case ModelGeneratorStates.ADD_ROADS: {
                if (this.polygonsToProcess.length === 0) {
                    const minorMesh = new THREE.Mesh(this.minorRoadsGeometry);
                    this.threeToBlender(minorMesh);
                    this.zip.file("model/minor_roads.stl", this.exportSTL.fromMesh(minorMesh));

                    const majorMesh = new THREE.Mesh(this.majorRoadsGeometry);
                    this.threeToBlender(majorMesh);
                    this.zip.file("model/major_roads.stl", this.exportSTL.fromMesh(majorMesh));

                    const mainMesh = new THREE.Mesh(this.mainRoadsGeometry);
                    this.threeToBlender(mainMesh);
                    this.zip.file("model/main_roads.stl", this.exportSTL.fromMesh(mainMesh));

                    this.setState(ModelGeneratorStates.ADD_PARKS);
                    this.polygonsToProcess = this.parks.map(p => ({poly: p, geometry: this.parksGeometry}));
                    break;
                }

                const task = this.polygonsToProcess.pop();
                const roadsMesh = this.polygonToMesh(task.poly, 0);
                task.geometry.merge(roadsMesh.geometry as THREE.Geometry, this.groundMesh.matrix);
                break;
            }
            case ModelGeneratorStates.ADD_PARKS: {
                if (this.polygonsToProcess.length === 0) {
                    const mesh = new THREE.Mesh(this.parksGeometry);
                    this.threeToBlender(mesh);
                    this.zip.file("model/parks.stl", this.exportSTL.fromMesh(mesh));

                    this.setState(ModelGeneratorStates.ADD_BLOCKS);
                    this.polygonsToProcess = this.blocks.map(b => ({poly: b, geometry: this.blocksGeometry}));
                    break;
                }

                const park = this.polygonsToProcess.pop();
                const parkMesh = this.polygonToMesh(park.poly, 0);
                park.geometry.merge(parkMesh.geometry as THREE.Geometry, this.groundMesh.matrix);
                break;
            }
            case ModelGeneratorStates.ADD_BLOCKS: {
                if (this.polygonsToProcess.length === 0) {
                    const mesh = new THREE.Mesh(this.blocksGeometry);
                    this.threeToBlender(mesh);
                    const blocksSTL = this.exportSTL.fromMesh(mesh);
                    this.zip.file("model/blocks.stl", blocksSTL);

                    this.setState(ModelGeneratorStates.ADD_BUILDINGS);
                    this.buildingsToProcess = [...this.buildings];
                    break;
                }

                const block = this.polygonsToProcess.pop();
                const blockMesh = this.polygonToMesh(block.poly, 1);
                this.blocksGeometry.merge(blockMesh.geometry as THREE.Geometry, this.groundMesh.matrix);
                break;
            }
            case ModelGeneratorStates.ADD_BUILDINGS: {
                if (this.buildingsToProcess.length === 0) {
                    const mesh = new THREE.Mesh(this.buildingsGeometry);
                    this.threeToBlender(mesh);
                    const buildingsSTL = this.exportSTL.fromMesh(mesh);
                    this.zip.file("model/buildings.stl", buildingsSTL);
                    this.setState(ModelGeneratorStates.CREATE_ZIP);
                    break;
                }

                const b = this.buildingsToProcess.pop();
                const buildingMesh = this.polygonToMesh(b.lotScreen, b.height);
                this.buildingsGeometry.merge(buildingMesh.geometry as THREE.Geometry, this.groundMesh.matrix);
                break;
            }
            case ModelGeneratorStates.CREATE_ZIP: {
                this.zip.generateAsync({type:"blob"}).then((blob: any) => this.resolve(blob));
                this.setState(ModelGeneratorStates.WAITING);
                break;
            }
            default: {
                break;
            }
        }
        return true;
    }

    /**
     * Rotate and scale mesh so up is in the right direction
     */
    private threeToBlender(mesh: THREE.Object3D): void {
        mesh.scale.multiplyScalar(0.02);
        mesh.updateMatrixWorld(true);
    }

    /**
     * Extrude a polygon into a THREE.js mesh
     */
    private polygonToMesh(polygon: Vector[], height: number): THREE.Mesh {
        if (polygon.length < 3) {
            log.error("Tried to export empty polygon as OBJ");
            return null;
        }
        const shape = new THREE.Shape();
        shape.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) {
            shape.lineTo(polygon[i].x, polygon[i].y);
        }
        shape.lineTo(polygon[0].x, polygon[0].y);

        if (height === 0) {
            return new THREE.Mesh(new THREE.ShapeGeometry(shape));
        }

        const extrudeSettings = {
            steps: 1,
            depth: height,
            bevelEnabled: false,
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const mesh = new THREE.Mesh(geometry);
        // mesh.translateZ(-height);
        mesh.updateMatrixWorld(true);
        return mesh;
    }
}
