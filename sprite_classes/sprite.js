import { HitBox, Point } from "../dungeonClasses/utilities.js";

export class Sprite {
    
    constructor(spriteSheetImageID, x, y, spriteWidth, spriteHeight, frameX, frameY) {
        this.spriteType = spriteSheetImageID;
        this.image = document.getElementById(spriteSheetImageID); //Image sheet to be used for this sprite
        this.frameX = frameX; //Which X frame are we currently on
        this.frameY = frameY;
        this.width = spriteWidth; //Width of one sprite frame
        this.height = spriteHeight; //Height of one sprite frame
        //NOTE:  Very Important, we are going to standardize on x,y being the center of the sprite so when we draw we will adjust for width and height
        this.x = x; //X Location of sprite in the world
        this.y = y; //Y Location of sprite in the world
        this.prevX = this.x;
        this.prevY = this.y;
        this.vx = 0;
        this.vy = 0;
        this.drawX = this.x - this.width/2;
        this.drawY = this.y - this.height/2;
        this.solid = true;
        this.visible = false;
        this.log = false; //this.spriteType == 'skeleton_sheet_small';
    }

    move(deltaX, deltaY) { 
        if (this.log) { console.log("move: " + deltaX + ", " + deltaY); }
        this.setLocation(this.x + deltaX, this.y + deltaY); 
    }
    getLocation() { return new Point(this.x, this.y); }
    undoMove() { 
        if (this.log) { console.log("undoMove: " + this.prevX + ", " + this.prevY); }
        this.setLocation(this.prevX, this.prevY); 
    }
    setLocation(x,y) { 
        this.prevX = this.x;
        this.prevY = this.y;
        if (this.log) { console.log("setLocation: " + x + ", " + y); }
        this.x = x;
        this.y = y;
        this.drawX = this.x - this.width/2;
        this.drawY = this.y - this.height/2;
    }


    update(deltaTime) {
        this.setLocation(this.x + this.vx*deltaTime, this.y + this.vy*deltaTime);
    }

    draw(context, drawHitBox) {
        if (this.visible) {
            if (drawHitBox === true) {
                context.strokeRect(this.drawX, this.drawY, this.width, this.height);
            }
            context.drawImage(this.image, this.frameX * this.width, this.frameY * this.height, this.width, this.height, 
                              this.drawX, this.drawY, this.width, this.height);
        }
    }

    getHitBox() {
        return new HitBox(this.drawX, this.drawY, this.width, this.height);
    }

    isCollision(target) {
        return this.getHitBox().overlap(target.getHitBox);
    }

    isVisible() { return this.visible; }
    hide() { this.visible = false;}
    show() { this.visible = true;}
}

export class RotatingSprite extends Sprite{
    constructor(spriteSheetImageID, x, y, spriteWidth, spriteHeight, degPerFrame, fps) {
        super(spriteSheetImageID, x, y, spriteWidth, spriteHeight, 0, 0);
        this.angles = [];
        for(let i=0; i< 360; i += 90) {
            this.angles.push(i);
        }
        this.va = degPerFrame; //Math.random() * 0.2 - 0.1;
        this.fps = fps; //How many frames per second should display (how fast is the animation)
        this.frameInterval = 1000/this.fps; //Based on the fps, we can determin how much time to leave between frames
        this.frameTimer = 0; //Need to keep track of how long we have been on this frame
    }

    update(deltaTime) {
        super.update(deltaTime);
        if (this.frameTimer > this.frameInterval) {
            for(let i=0; i<this.angles.length; i++) { this.angles[i] += this.va*Math.PI/180 + Math.random(); }
            this.frameTimer -= this.frameInterval;
        }
        else {
            this.frameTimer += deltaTime;
        }
    }
    draw(context) {
        this.angles.forEach((angle) => {
            context.save();
            context.translate(this.x, this.y); //Put canvas at center of image
            context.rotate(angle); // Rotate canvas
            context.drawImage(this.image, this.width/-2, this.height/-2, this.width, this.height); 
            context.restore();
        })
    }
}

export class RandomeSpirte extends Sprite {
    constructor(spriteSheetImageID, x, y, spriteWidth, spriteHeight, numberFrames) {
        super(spriteSheetImageID, x, y, spriteWidth, spriteHeight, Math.floor(Math.random() * numberFrames),0)
    }
}

export class AnimatedSprite extends Sprite {
    constructor(spriteSheetImageID, x, y, spriteWidth, spriteHeight, numberFrames, fps, loop) {
        super(spriteSheetImageID, x, y, spriteWidth, spriteHeight, 0, 0);
        this.fps = fps; //How many frames per second should display (how fast is the animation)
        this.frameInterval = 1000/this.fps; //Based on the fps, we can determin how much time to leave between frames
        this.frameTimer = 0; //Need to keep track of how long we have been on this frame
        this.maxFrames = numberFrames-1;
        this.loop = loop;
        this.animationFinished = false;
        this.endAnimationDelay = 1000;
    }

    restartAnimation() {
        this.frameX = 0;
        this.animationFinished = false;
    }

    update(deltaTime) {
        super.update(deltaTime);
        //Sprite Animation
        if (this.animationFinished) {
            this.endAnimationDelay -= deltaTime;
        }
        else if (this.frameTimer > this.frameInterval) { //If we have spent enough time on this frame, move to the next
            this.frameTimer = 0;
            if (this.frameX < this.maxFrames) { 
                this.frameX++;
            }
            else if (this.loop == true) {
                this.restartAnimation();
                this.frameTimer -= this.frameInterval;
            }
            else {
                this.frameX = this.maxFrames -1;
                this.animationFinished = true;
            }
        } else {
            this.frameTimer += deltaTime;
        }
    }



}

