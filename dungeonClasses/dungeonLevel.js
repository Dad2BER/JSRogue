import { TileMap } from "./tileMap.js";
import { JitterPoint, Point, direction } from "../utilities.js";
import { rat, ratSubtype } from "./monster.js";
import { TreasureChest } from "./treasureChest.js";
import { Potion } from "./potion.js";
import { Scroll } from "./scroll.js";
import { Gold } from "./gold.js";

export class DungeonLevel extends TileMap {
    constructor(width, height, potionDictionary, scrollDictionary) {
        super(width, height);
        this.monsters = [];
        this.treasureChests = [];
        this.items = [];
        this.diceBag = this.myRandom;
        this.potionDictionary = potionDictionary;
        this.scrollDictionary = scrollDictionary;
        this.populateLevel();
        //this.showAll();
    }

    showMonsters() { this.monsters.forEach((monster) => monster.show()  );                            }
    showChests()   { this.treasureChests.forEach((chest)=> chest.show() );                            }
    showItems()    { this.items.forEach((item)=> item.show()            );                            } 
    showPotions()  { this.items.forEach((item)=> { if (item.spriteType == "potions") item.show(); }); }
    showScrolls()  { this.items.forEach((item)=> { if (item.spriteType == "scrolls") item.show(); }); }
    showGold()     { this.items.forEach((item)=> { if (item.spriteType == "gold")    item.show(); })  }
    showMap()      { super.showAll()                                                                  }
    showAll() {
        this.showMap();
        this.showMonsters();
        this.showChests();
        this.showItems();
    }

    openChest(chest) {
        chest.open();
        let addPotions = this.diceBag.intBetween(0,2); //How many potions to put in this room
        let addScrolls = this.diceBag.intBetween(0,2); // How many scrolls to put in this room
        let addGold = this.diceBag.intBetween(0,2); //How many gold pilse to put in this room
        for (let j=0; j<addPotions; j++) {
            let randomPotion = this.potionDictionary.getRandom();
            let pt = new JitterPoint(chest.x, chest.y, 32, 32);
            this.items.push(new Potion(pt.x, pt.y, randomPotion.color));
        }
        for (let j=0; j<addScrolls; j++) {
            let randomScroll = this.scrollDictionary.getRandom();
            let pt = new JitterPoint(chest.x, chest.y, 32, 32);
            this.items.push(new Scroll(pt.x, pt.y, randomScroll.color));
        }
        for (let j=0; j<addGold; j++) {
            let pt = new JitterPoint(chest.x, chest.y, 32, 32);
            this.items.push(new Gold(pt.x, pt.y, this.diceBag.d6()+1));
        }
    }



    populateLevel() {
        //Monsters go in every room, except the first (to make it safe for the player)
        for(let i=1; i<this.rooms.length; i++) {
            let x = this.diceBag.intBetween(this.rooms[i].x, this.rooms[i].x+this.rooms[i].width-32)+16;
            let y = this.diceBag.intBetween(this.rooms[i].y, this.rooms[i].y+this.rooms[i].height-32)+16;
            let monster = new rat(x,y,ratSubtype.BROWN);
            monster.setRandomDirection();
            this.monsters.push(monster);
        }       
       for(let i=0; i<this.rooms.length; i++) {
            let addPotions = this.diceBag.intBetween(0,2); //How many potions to put in this room
            let addScrolls = this.diceBag.intBetween(0,2); // How many scrolls to put in this room
            let addChests = this.diceBag.intBetween(0,1); //How many Chests to put in this room
            let addGold = this.diceBag.intBetween(0,2); //How many gold pilse to put in this room
            for (let j=0; j<addChests; j++) {
                let RandomPoint = this.getRandomRoomPoint(i);
                this.treasureChests.push(new TreasureChest(RandomPoint.x,RandomPoint.y));
            }
            for (let j=0; j<addPotions; j++) {
                let RandomPoint = this.getRandomRoomPoint(i);
                let randomPotion = this.potionDictionary.getRandom();
                this.items.push(new Potion(RandomPoint.x,RandomPoint.y, randomPotion.color));
            }
            for (let j=0; j<addScrolls; j++) {
                let RandomPoint = this.getRandomRoomPoint(i);
                let randomScroll = this.scrollDictionary.getRandom();
                this.items.push(new Scroll(RandomPoint.x,RandomPoint.y, randomScroll.color));
            }
            for (let j=0; j<addGold; j++) {
                let RandomPoint = this.getRandomRoomPoint(i);
                this.items.push(new Gold(RandomPoint.x, RandomPoint.y, this.diceBag.d6()+1));
            }
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.monsters.forEach((monster)=> { 
            monster.update(deltaTime);
            if ( this.adjustMovingObject(monster)==true || this.diceBag.percent()>99) { //If we collided with something change direction
                monster.setRandomDirection();
            }
        })
        this.treasureChests.forEach((chest)=> { chest.update(deltaTime); })
        this.items.forEach((item)=> { item.update(deltaTime); })
    }

    draw(context) {
        super.draw(context);
        this.monsters.forEach((monster, index)=>  { 
            monster.draw(context); 
            if (monster.markedForDeletion) { 
                this.monsters.splice(index, 1);
                console.log("monster deleted");
            }
        })
        this.treasureChests.forEach((chest)=> {
            chest.draw(context);
            if (chest.markedForDeletion) { this.treasureChests.splice(index, 1);}
        }) 
        this.items.forEach((item)=> {
            item.draw(context);
            if (item.markedForDeletion) { this.items.splice(index, 1);}
        }) 
    }

    //Helper function to make it easy to return monsters, chests, and items that are within a hitBox
    overlapItems(list, hitBox) {
        let overlap = [];
        list.forEach((item) => {
            if (item.getHitBox().overlap(hitBox)) { 
                overlap.push(item); 
            }
        })
        return overlap;
    }

    //Return a list of all the monsters that overlap with this hitBox
    monsterCollisions(hitBox) { return this.overlapItems(this.monsters, hitBox); }
    chestCollisions(hitBox) { return this.overlapItems(this.treasureChests, hitBox); }
    itemCollisions(hitBox) { return this.overlapItems(this.items, hitBox); }

    removeFromList(list, thing) {
        
    }
    removeItem(item) { this.items.splice(this.items.indexOf(item), 1); }
    removeMonster(monster) { this.monster.splice(this.monsters.indexOf(monster), 1); }
    removeChest(chest) {this.treasureChests.splice(this.treasureChests.indexOf(chest), 1); }

    
    showRoom(room) {
        super.showRoom(room);
        let roomRect = room.getHitBox();
        this.monsterCollisions(roomRect).forEach((monster) => {monster.show();})
        this.chestCollisions(roomRect).forEach((chest) => {chest.show();})
        this.itemCollisions(roomRect).forEach((item) => {item.show();})
    }
}