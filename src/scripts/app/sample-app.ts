import {RotatingSprite} from "app/rotating-sprite";
import {TweenLite} from "gsap";
import "howler";
import {
    Dom,
    PixiAppWrapper as Wrapper,
    pixiAppWrapperEvent as WrapperEvent,
    PixiAppWrapperOptions as WrapperOpts,
} from "pixi-app-wrapper";
import {Asset, AssetPriority, LoadAsset, PixiAssetsLoader, SoundAsset} from "pixi-assets-loader";
import {
    AsciiFilter,
    CRTFilter,
    GlowFilter,
    OldFilmFilter,
    OutlineFilter,
    ShockwaveFilter,
} from "pixi-filters";
import "pixi-particles";
import "pixi-spine";

/**
 * Showcase for PixiAppWrapper class.
 */
export class SampleApp {
    private app: Wrapper;

    private screenBorder: PIXI.Graphics;
    private fullScreenButton: PIXI.Container;

    private StageContainer: PIXI.Container;
    private fullScreenText: PIXI.extras.BitmapText;
    private explorer: RotatingSprite;
    private layeredBunnies: PIXI.Container;
    private particlesContainer: PIXI.particles.ParticleContainer;
    private playMusicContainer: PIXI.Container;
    private spineBoy: PIXI.spine.Spine;

    private particlesEmitter: PIXI.particles.Emitter;
    private sound: Howl;

    private loader: PixiAssetsLoader;

    private totalAssets: number;
    private assetsCount: { [key: number]: { total: number, progress: number } } = {};

    private textStyle = new PIXI.TextStyle({
        fontFamily: "Verdana",
        fontSize: 24,
        fill: "#FFFFFF",
        wordWrap: true,
        wordWrapWidth: 440,
    });

    private bitmapTextStyle: PIXI.extras.BitmapTextStyle = {font: "35px Desyrel", align: "center"};

    constructor() {
        const canvas = Dom.getElementOrCreateNew<HTMLCanvasElement>("app-canvas", "canvas", document.getElementById("app-root"));

        // if no view is specified, it appends canvas to body
        const appOptions: WrapperOpts = {
            width: 1920,
            height: 1080,
            scale: "keep-aspect-ratio",
            align: "middle",
            resolution: window.devicePixelRatio,
            roundPixels: true,
            transparent: false,
            backgroundColor: 0x000000,
            view: canvas,
            showFPS: true,
            showMediaInfo: true,
            changeOrientation: true,
        };

        this.app = new Wrapper(appOptions);
        this.app.on(WrapperEvent.RESIZE_START, this.onResizeStart.bind(this));
        this.app.on(WrapperEvent.RESIZE_END, this.onResizeEnd.bind(this));

        this.createViews(); // Draw views that can be already drawn

        const assets = [
            {id: "desyrel", url: "assets/fonts/desyrel.xml", priority: AssetPriority.HIGHEST, type: "font"},
            {id: "play", url: "assets/gfx/play.png", priority: AssetPriority.LOW, type: "texture"},
            {id: "stop", url: "assets/gfx/stop.png", priority: AssetPriority.LOW, type: "texture"},
            {id: "bunny", url: "assets/gfx/bunny.png", priority: AssetPriority.HIGH, type: "texture"},
            {id: "spineboy", url: "assets/gfx/spineboy.json", priority: AssetPriority.HIGHEST, type: "animation"},
            {id: "bubble", url: "assets/gfx/Bubbles99.png", priority: AssetPriority.NORMAL, type: "texture"},
            {id: "sound1", url: "assets/sfx/sound1.mp3", priority: AssetPriority.LOW, autoplay: false, loop: false, mute: false, rate: 1, type: "sound"} as Asset,
            {id: "atlas1", url: "assets/gfx/treasureHunter.json", priority: AssetPriority.LOWEST, type: "atlas"},
            // 404 Assets to test loading errors
            {id: "explorer", url: "assets/gfx/explorer.png", priority: AssetPriority.LOWEST, type: "texture"},
            {id: "sound2", url: "assets/sfx/sound2.mp3", priority: AssetPriority.LOW, autoplay: false, loop: false, mute: false, rate: 1, type: "sound"} as Asset,
        ];

        assets.forEach(asset => {
           if (!this.assetsCount[asset.priority]) {
               this.assetsCount[asset.priority] = {total: 1, progress: 0};
           } else {
               this.assetsCount[asset.priority].total++;
           }
        });

        this.totalAssets = assets.length;

        this.loader = new PixiAssetsLoader();
        this.loader.on(PixiAssetsLoader.PRIORITY_GROUP_LOADED, this.onAssetsLoaded.bind(this));
        this.loader.on(PixiAssetsLoader.ASSET_ERROR, this.onAssetsError.bind(this));
        this.loader.on(PixiAssetsLoader.ALL_ASSETS_LOADED, this.onAllAssetsLoaded.bind(this));

        this.loader.addAssets(assets).load();
    }

    public drawSquare(x = 0, y = 0, s = 50, r = 10): void {


        this.drawRoundedRectangle(x, y, s, s, r);
    }

    public drawRoundedRectangle(x = 0, y = 0, w = 50, h = 50, r = 10): void {
        this.fullScreenButton = new PIXI.Container();

        this.StageContainer = new PIXI.Container();

        const pos= {x:0, y:0};

        const circle1 = new PIXI.Circle(pos.x, pos.y, 100);
        const button = new PIXI.Graphics();
        button.lineStyle(2, 0xFF00FF, 1);
        button.beginFill(0xFF00BB, 0.25);
        button.drawRoundedRect(0, 0, w, h, r);
        button.endFill();

        button.interactive = true;
        button.buttonMode = true;
        button.on("pointerup", () => {
            // pointerdown does not trigger a user event in chrome-android
            Wrapper.toggleFulscreen(document.getElementById("app-root"));
        });

        this.fullScreenButton.addChild(button);
        this.fullScreenButton.position.set(x, y);

        this.app.stage.addChild(this.fullScreenButton);

        let obj = new PIXI.Graphics()
        let circleContext = new new PIXI.GraphicsContext()
  .circle(100, 100, 50)
  .fill('red');
        this.StageContainer.addChild(circleContext);

        this.app.stage.addChild(this.StageContainer);
    }

    private onAssetsLoaded(args: { priority: number, assets: LoadAsset[] }): void {
        window.console.log(`[SAMPLE APP] onAssetsLoaded ${args.assets.map(loadAsset => loadAsset.asset.id)}`);

        args.assets.forEach(loadAsset => {
            if (loadAsset.asset.id === "sound1" && loadAsset.loaded) {
                this.sound = (loadAsset.asset as SoundAsset).howl!;
            }
        });

        this.createViewsByPriority(args.priority);
    }

    private onAssetsError(args: LoadAsset): void {
        window.console.log(`[SAMPLE APP] onAssetsError ${args.asset.id}: ${args.error!.message}`);
    }

    private onAllAssetsLoaded(): void {
        window.console.log("[SAMPLE APP] onAllAssetsLoaded !!!!");
    }

    private drawScreenBorder(width = 4): void {
        const halfWidth = width / 2;

        this.screenBorder = new PIXI.Graphics();
        this.screenBorder.lineStyle(width, 0xFF00FF, 1);
        this.screenBorder.drawRect(halfWidth, halfWidth, this.app.initialWidth - width, this.app.initialHeight - width);

        this.app.stage.addChild(this.screenBorder);
    }

    private onResizeStart(): void {
        window.console.log("RESIZE STARTED!");
    }

    private onResizeEnd(args: any): void {
        window.console.log("RESIZE ENDED!", args);

        if (args.stage.orientation.changed) {
            this.relocateViews();
        }
    }

    private stopEmittingParticles(): void {
        if (this.particlesEmitter) {
            this.particlesEmitter.emit = false;
            this.particlesEmitter.cleanup();
        }
    }

    private startEmittingParticles(): void {
        if (this.particlesEmitter) {
            this.particlesEmitter.emit = true;
        }
    }

    private addFullscreenText(x: number, y: number): void {
        this.fullScreenText = new PIXI.extras.BitmapText("Click on the square\n to toggle fullscreen!", this.bitmapTextStyle);
        this.fullScreenText.position.set(x - this.fullScreenText.width / 2, y);

        this.app.stage.addChild(this.fullScreenText);
    }
    private createViews(): void {
        this.drawSquare(this.app.initialWidth / 2 - 25, this.app.initialHeight / 2 - 25);
        this.drawScreenBorder();
    }

    private createViewsByPriority(priority: number): void {
        switch (priority) {
            case AssetPriority.HIGHEST:
                this.addFullscreenText(this.app.initialWidth / 2, this.app.initialHeight / 2 - 125);
                this.drawSpineBoyAnim();
                break;


            // case AssetPriority.NORMAL:
            //     this.drawParticles();
            //     break;

            case AssetPriority.LOWEST:
                this.drawRotatingExplorer();
                break;

            default:
                break;
        }
    }

    private removeViews(): void {
        this.app.stage.removeChildren();
    }

    private drawRotatingExplorer(): void {
        // This creates a texture from a "explorer.png" within the atlas
        this.explorer = new RotatingSprite(PIXI.loader.resources.atlas1.textures!["explorer.png"]);
        this.explorer.scale.set(2, 2);

        // Setup the position of the explorer
        const maxEdge = Math.max(this.explorer.width, this.explorer.height);
        this.explorer.position.set(Math.ceil(maxEdge / 2) + 10, Math.ceil(maxEdge / 2) + 10);

        // Rotate around the center
        this.explorer.anchor.set(0.5, 0.5);

        this.explorer.interactive = true;
        this.explorer.buttonMode = true;
        this.explorer.rotationVelocity = 0.02;

        this.explorer.on("pointerdown", () => {
            this.explorer.rotationVelocity *= -1;
        });

        // Add the explorer to the scene we are building
        this.app.stage.addChild(this.explorer);

        // Listen for frame updates
        this.app.ticker.add(() => {
            // each frame we spin the explorer around a bit
            this.explorer.rotation += this.explorer.rotationVelocity;
        });

        TweenLite.to(this.explorer, 2, {y: this.app.initialHeight / 2});
    }

    // private drawParticles(): void {
    //     this.particlesContainer = new PIXI.particles.ParticleContainer();
    //     this.particlesContainer.position.set(this.app.initialWidth * 0.75, this.app.initialHeight * 0.5);
    //     this.app.stage.addChild(this.particlesContainer);

    //     this.particlesEmitter = new PIXI.particles.Emitter(this.particlesContainer, PIXI.loader.resources.bubble.texture, {
    //         alpha: {
    //             start: 0.8,
    //             end: 0.1,
    //         },
    //         scale: {
    //             start: 1,
    //             end: 0.3,
    //         },
    //         color: {
    //             start: "ffffff",
    //             end: "0000ff",
    //         },
    //         speed: {
    //             start: 200,
    //             end: 100,
    //         },
    //         startRotation: {
    //             min: 0,
    //             max: 360,
    //         },
    //         rotationSpeed: {
    //             min: 0,
    //             max: 0,
    //         },
    //         lifetime: {
    //             min: 0.5,
    //             max: 2,
    //         },
    //         frequency: 0.1,
    //         emitterLifetime: -1,
    //         maxParticles: 1000,
    //         pos: {
    //             x: 0,
    //             y: 0,
    //         },
    //         addAtBack: false,
    //         spawnType: "circle",
    //         spawnCircle: {
    //             x: 0,
    //             y: 0,
    //             r: 10,
    //         },
    //         emit: false,
    //         autoUpdate: true,
    //     });

    //     // Calculate the current time
    //     let elapsed = Date.now();

    //     // Update function every frame
    //     const update = () => {

    //         // Update the next frame
    //         // requestAnimationFrame(update);

    //         const now = Date.now();

    //         // The emitter requires the elapsed
    //         // number of seconds since the last update
    //         this.particlesEmitter.update((now - elapsed) * 0.001);
    //         elapsed = now;
    //     };

    //     // Start emitting
    //     this.startEmittingParticles();

    //     // Start the update
    //     // update();
    //     this.app.ticker.add(update);
    // }

    private drawSpineBoyAnim(): void {
        // create a spine boy
        this.spineBoy = new PIXI.spine.Spine(PIXI.loader.resources.spineboy.spineData);

        this.spineBoy.scale.set(0.5);

        // set the position
        this.spineBoy.x = this.app.initialWidth * 0.5;
        this.spineBoy.y = this.app.initialHeight;

        // set up the mixes!
        this.spineBoy.stateData.setMix("walk", "jump", 0.2);
        this.spineBoy.stateData.setMix("jump", "walk", 0.4);

        // play animation
        this.spineBoy.state.setAnimation(0, "walk", true);

        this.spineBoy.interactive = true;
        this.spineBoy.buttonMode = true;

        this.spineBoy.on("pointerdown", () => {
            this.spineBoy.state.setAnimation(0, "jump", false);
            this.spineBoy.state.addAnimation(0, "walk", true, 0);
        });

        this.app.stage.addChild(this.spineBoy);
    }


    private relocateViews(): void {
        /*
        this.screenBorder.width = this.app.initialWidth - 2;
        this.screenBorder.height = this.app.initialHeight - 2;
        window.console.log(this.screenBorder.width, this.screenBorder.height);
        */
        this.app.stage.removeChild(this.screenBorder);
        this.drawScreenBorder();

        if (this.fullScreenButton) {
            this.fullScreenButton.position.set(this.app.initialWidth / 2 - this.fullScreenButton.width / 2, this.app.initialHeight / 2 - this.fullScreenButton.height / 2);
        }

        if (this.fullScreenText) {
            this.fullScreenText.position.set(this.app.initialWidth / 2 - this.fullScreenText.width / 2, this.app.initialHeight / 2 - 125);
        }
        if (this.layeredBunnies) {
            this.layeredBunnies.position.set((this.app.initialWidth - this.layeredBunnies.width) - 10, 10);
        }

        if (this.particlesContainer) {
            this.particlesContainer.position.set(this.app.initialWidth * 0.75, this.app.initialHeight * 0.5);
        }

        if (this.spineBoy) {
            this.spineBoy.position.set(this.app.initialWidth * 0.5, this.app.initialHeight);
        }

        if (this.explorer) {
            TweenLite.killTweensOf(this.explorer, true);
            const maxEdge = Math.max(this.explorer.width, this.explorer.height);
            this.explorer.position.set(Math.ceil(maxEdge / 2) + 10, Math.ceil(maxEdge / 2) + 10);
            TweenLite.to(this.explorer, 2, {y: this.app.initialHeight / 2});
        }
    }
}
