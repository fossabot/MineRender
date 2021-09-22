import { Object3D, Scene } from "three";
import { SceneObject } from "./SceneObject";
import { isSceneObject } from "../util/three";
import merge from "ts-deepmerge";
import { Model } from "../model/Model";
import { ModelObject, ModelObjectOptions } from "../model/scene/ModelObject";
import { InstanceReference } from "../instance/InstanceReference";
import { SceneStats } from "../SceneStats";
import { SSAOPassOUTPUT } from "three/examples/jsm/postprocessing/SSAOPass";
import { MinecraftAsset } from "../MinecraftAsset";
import { SceneObjectOptions } from "./SceneObjectOptions";
import { BlockState } from "../model/block/BlockState";
import { BlockObject, BlockObjectOptions } from "../model/block/scene/BlockObject";
import { BlockInstance } from "../model/block/scene/BlockInstance";
import { InstanceManager } from "../instance/InstanceManager";

export class MineRenderScene extends Scene {

    public readonly isMineRenderScene: true = true;

    public static readonly DEFAULT_OPTIONS: MineRenderSceneOptions = merge({}, <MineRenderSceneOptions>{});
    public readonly options: MineRenderSceneOptions;

    readonly stats: SceneStats = new SceneStats();
    protected readonly instanceManager: InstanceManager = new InstanceManager();

    constructor(options?: Partial<MineRenderSceneOptions>) {
        super();
        this.options = merge({}, MineRenderScene.DEFAULT_OPTIONS, options ?? {});
    }

    add(...object): this {
        this.stats.objectCount += object.length;
        for (let obj of object) {
            if (isSceneObject(obj)) {
                this.stats.sceneObjectCount++;
            }
        }
        return super.add(...object);
    }

    public async initAndAdd(...object: SceneObject[]): Promise<this> {
        for (let obj of object) {
            await obj.init();
        }
        return this.add(...object);
    }

    async addSceneObject<A extends MinecraftAsset, T extends SceneObject, O extends SceneObjectOptions>(asset: A, objectSupplier: () => T | Promise<T>, options?: Partial<O>, parent: Object3D = this): Promise<T | InstanceReference<T>> {
        // console.log(this.instanceCache)
        if (options?.instanceMeshes && asset.key) {
            // console.log("instanceMeshes + key")
            // check for existing instances
            const key = asset.key.serialize();
            //TODO use the parent's instance manager
            return this.instanceManager.getOrCreate(key, async () => {
                const obj = await objectSupplier();
                obj.scene = this;
                await obj.init();
                parent.add(obj);
                return obj;
            });
        } else {
            // console.log("!instanceMeshes | !key")
            const obj = await objectSupplier();
            obj.scene = this;
            // await this.initAndAdd(obj);
            await obj.init();
            parent.add(obj);
            return obj;
        }
    }

    public async addModel(model: Model, options?: Partial<ModelObjectOptions>): Promise<ModelObject | InstanceReference<ModelObject>> {
        return this.addSceneObject<Model, ModelObject, ModelObjectOptions>(model, () => new ModelObject(model, options), options);
    }

    public async addBlock(blockState: BlockState, options?: Partial<BlockObjectOptions>): Promise<BlockObject | BlockInstance> {
        return <BlockObject | BlockInstance>await this.addSceneObject<BlockState, BlockObject, BlockObjectOptions>(blockState, () => new BlockObject(blockState, options), options);
    }

}

export interface MineRenderSceneOptions {

}


export function isMineRenderScene(obj: any): obj is MineRenderScene {
    return (<MineRenderScene>obj).isMineRenderScene;
}
