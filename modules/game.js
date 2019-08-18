import Generator from "./generator.js";
import Renderer from "./renderer.js";
import { keyIsDown } from "./keyHandler.js";

const ACC = .25 / 30;
const STEER = 2 / 30;
const TRACT = 0.1;
const FRIC = 0.1;

class Car {
    constructor(renderer, generator) {
        this.x = 0;
        this.y = 0;
        this.hspd = 0;
        this.vspd = 0;
        this.angle = 0;

        this.renderer = renderer;
        this.generator = generator;
    }

    update() {
        let acceleration = (keyIsDown("up") - keyIsDown("down")) * ACC;
        let steering = (keyIsDown("right") - keyIsDown("left"))
        this.renderer.carFrame = -steering+1;
        steering *= STEER;

        this.angle += steering;
        this.hspd += Math.cos(this.angle) * acceleration;
        this.vspd += Math.sin(this.angle) * acceleration;
        this.x += this.hspd;
        this.y += this.vspd;

        // friction

        // sideways
        let dx = -Math.sin(this.angle);
        let dy = Math.cos(this.angle);
        let scl = (dx * this.hspd + dy * this.vspd) * TRACT;
        this.hspd -= scl * dx;
        this.vspd -= scl * dy;

        // forw. backw.
        dx = Math.cos(this.angle);
        dy = Math.sin(this.angle);
        scl = (dx * this.hspd + dy * this.vspd) * FRIC;
        this.hspd -= scl * dx;
        this.vspd -= scl * dy;


        // render
        this.renderer.x = this.x;
        this.renderer.y = this.y;
        this.renderer.z = 0.25 + this.generator.sampleHeightmap(this.x, this.y);
        this.renderer.angle = this.angle;
        this.renderer.render();
    }
}

window.addEventListener("load", () => {
    startGame();
});

async function startGame() {
    let gen = new Generator(64);
    let rend = new Renderer(gen, document.querySelector("canvas.game"));
    await rend.load();
    let car = new Car(rend, gen);
    window.setInterval(() => {
        car.update();
    }, 1000/30)
}