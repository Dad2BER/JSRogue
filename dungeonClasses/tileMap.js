import { randomeBrickBrown, randomGrayFloor, doorHorizontal, stairUp, stairDown } from "../sprite_classes/knownSprites.js";
import { create2DArray, HitBox, RandomNumber, direction, Point } from "./utilities.js";

const tileType = { FLOOR: 0, WALL: 1 };

export class TileMap {
    constructor(width,height){
        //Our initial implementation will just draw a wall around the boarder
        this.width = width;
        this.height = height;
        this.currentRegion = -1
        this.map = create2DArray(this.width, this.height);
        this.regions2D = create2DArray(this.width, this.height);
        this.rooms = [];
        this.doors = [];
        this.stairsDown = null;
        this.stairsUp = null;
        this.myRandom = new RandomNumber();
        this.windingPercent = 0;
        //This is mostly a port of what I implemented in the Java version of Rogue
	    this.setMapTiles(0, 0, this.width, this.height, tileType.WALL);	 //Allocate the grid and set all the cells to walls to start		
	    this.placeRooms(10); //Randomly place rooms onto the Grid (No two rooms may overlap)
	    this.fillInMaze();  	 //Fill in anywhere that is not a room with hallways
	    this.connectRegions();  	 //Start in a random room, remove a connector to join it to a neighboring region.	
	    this.fillDeadEnds();	 //Clean up dead end hallways

        this.convertGridToSprites();
        this.addDoors();

    }

    showAll() {
        for(let x=0; x<this.width; x++) {
            for(let y=0; y<this.height; y++) {
                this.map[x][y].show();
            }
        }
        this.doors.forEach((door)=>door.show());
        if(this.stairsUp != null) {this.stairsUp.show();}
        if(this.stairsDown != null) {this.stairsDown.show();}
    }

    //NOTE:  Trick to this, is that rooms always are located at an odd number x,y and are odd widths and heights
    //	     This guarantees that there is the correct spacing for hallways
	placeRooms(maxRooms) {
		for(let tryCount=0; tryCount<maxRooms; tryCount++) {
            this.tryPlaceRoom(50); //We are going to try 50 times to find a place for the room to fit before we give up.
		}
	}

    tryPlaceRoom(maxTrys) {
        let tryCount=0;
        do {
            tryCount++;
			let width = 3 + this.myRandom.int(2)*2; // This will give us 3, 5, 7 as possible room widths
			let height = 3 + this.myRandom.int(2)*2; // This will give us 3, 5, 7 as possible room heights
			let x = this.myRandom.int((this.width-width-1)/2)*2+1;
			let y = this.myRandom.int((this.height-height-1)/2)*2+1;
			if ((x+width) < this.width && (y+height) < this.height) {
                let newRoom = new Room(x, y, width, height);
				let bAddRoom = true; //Check every existing room to see if this room overlaps
                this.rooms.forEach((room) => {
                    if (room.gridBox.overlap(newRoom.gridBox)) {
                        bAddRoom = false;
                    }
                })
				if (bAddRoom) {//We did not find any overlapping room, so we can add it
					this.currentRegion++;
                    this.rooms.push(newRoom);
                    this.setMapTiles(newRoom.gridBox.x, newRoom.gridBox.y, newRoom.gridBox.width, newRoom.gridBox.height, tileType.FLOOR);
                    tryCount = maxTrys;
				}
			}
		} while (tryCount < maxTrys)
    }

    fillInMaze() {
        for (let y = 1; y < this.height; y += 2) {
            for (let x = 1; x < this.width; x += 2) {
                if (this.map[x][y] == tileType.WALL) { //Grow Maze
                    let cells = [];
                    let lastDirection = -1;            
                    this.currentRegion++;
                    this.map[x][y] = tileType.FLOOR;
                    this.regions2D[x][y] = this.currentRegion;
                    let start = new Point(x,y);
                    cells.push(start);
            
                    while (cells.length > 0) {
                        let cell = cells[cells.length-1];
                        // See which adjacent cells are open.
                        let unmadeCells = [];
                        for(let dir = 0; dir<=3; dir++) { if (this.canCarve(cell, dir)) unmadeCells.push(dir); }
                        if(unmadeCells.length > 0) { //Did we find at least one direction we can go		        
                            let newDirection = lastDirection;  // Prefer carving in the same direction
                            if (unmadeCells.includes(lastDirection) && this.myRandom.percent() > this.windingPercent) {
                                newDirection = lastDirection;
                            } 
                            else {
                                let randomIndex = this.myRandom.int(unmadeCells.length);
                                newDirection = unmadeCells[randomIndex];
                            }
                            let carvePoint = this.directionOffset(cell, newDirection, 1);
                            this.map[carvePoint.x][carvePoint.y] = tileType.FLOOR;
                            this.regions2D[carvePoint.x][carvePoint.y] = this.currentRegion;
                            carvePoint = this.directionOffset(cell, newDirection, 2);
                            this.map[carvePoint.x][carvePoint.y] = tileType.FLOOR;
                            this.regions2D[carvePoint.x][carvePoint.y] = this.currentRegion;
                            cells.push(carvePoint);
                            lastDirection = newDirection;
                        } 
                        else {  // No adjacent uncarved cells.
                            cells.length--;
                            lastDirection = -1;  // This path has ended.
                        }
                    }
                }
            }
        }		
    }

    connectRegions() {
	    //Region 0 is always a randomly placed room.  We will start there
	    this.currentRegion = 0;
	    let possibleConnectors = this.getBoarderWalls(this.currentRegion);
	    while (possibleConnectors.length > 0) { //If there are possible connectors, there must be multiple regions
		    let randomIndex = this.myRandom.intBetween(0, possibleConnectors.length-1);
		    this.ConnectSections(possibleConnectors[randomIndex]);
		    possibleConnectors = this.getBoarderWalls(this.currentRegion);
		}
	}

    getBoarderWalls(regionID) {
		let boarderWalls = [];
		for (let y = 1; y < this.height-1; y ++) {
		      for (let x = 1; x < this.width-1; x ++) {
		    	  if(this.isBoarderWall(x,y,regionID)) {  boarderWalls.push(new Point(x,y));	  }
		      }
		}
		return boarderWalls;
	}

    isBoarderWall(x, y, regionID) {
		let bRVal = false;
		if (this.regions2D[x][y] != -1) { //The block must be a wall
			bRVal = false;
		}
		else {  
			let regionMatchCount = 0;
			if (this.regions2D[x-1][y] == regionID) {regionMatchCount++;}
			if (this.regions2D[x+1][y] == regionID) {regionMatchCount++;}
			if (this.regions2D[x][y-1] == regionID) {regionMatchCount++;}
			if (this.regions2D[x][y+1] == regionID) {regionMatchCount++;}
			if (regionMatchCount == 1) { //The region we are looking for exists on only one side of the wall
				let otherRegionCount = 0;
				if (this.regions2D[x-1][y] != regionID && this.regions2D[x-1][y] != -1) {otherRegionCount++;}
				else if (this.regions2D[x+1][y] != regionID && this.regions2D[x+1][y] != -1) {otherRegionCount++;}
				else if (this.regions2D[x][y-1] != regionID && this.regions2D[x][y-1] != -1) {otherRegionCount++;}
				else if (this.regions2D[x][y+1] != regionID && this.regions2D[x][y+1] != -1) {otherRegionCount++;}
				if (otherRegionCount > 0) { 	bRVal = true;	}
			}
		}
		return bRVal;
	}

    ConnectSections(p) {
        this.map[p.x][p.y] = tileType.FLOOR;
	    this.regions2D[p.x][p.y] = this.currentRegion;
	    if (this.regions2D[p.x-1][p.y] != -1 && this.regions2D[p.x-1][p.y] != this.currentRegion ) {this.setRegion(this.regions2D[p.x-1][p.y]); }
	    if (this.regions2D[p.x+1][p.y] != -1 && this.regions2D[p.x+1][p.y] != this.currentRegion ) {this.setRegion(this.regions2D[p.x+1][p.y]);	}
	    if (this.regions2D[p.x][p.y-1] != -1 && this.regions2D[p.x][p.y-1] != this.currentRegion ) {this.setRegion(this.regions2D[p.x][p.y-1]);}
	    if (this.regions2D[p.x][p.y+1] != -1 && this.regions2D[p.x][p.y+1] != this.currentRegion ) {this.setRegion(this.regions2D[p.x][p.y+1]);}
	}

    setRegion(oldRegion) {
		for(let y=0; y<this.height; y++) {
			for(let x=0; x<this.width; x++){
				if (this.regions2D[x][y] == oldRegion) { this.regions2D[x][y] =this.currentRegion; }
			}	
		}		
	}

    directionOffset(p, d, m) {
		let deltaY = 0;
		let deltaX = 0;
		switch(d) {
			case direction.UP:		deltaY = -1;		break;
			case direction.DOWN:	deltaY = 1;		break;
			case direction.LEFT:	deltaX = -1;		break;
			case direction.RIGHT: 	deltaX = 1;		break;
		}
		return new Point(p.x + deltaX*m, p.y + deltaY*m);
	}

    canCarve(pos, dir) {
		let bRVal = false;
		let gridCheckPoint = this.directionOffset(pos, dir, 3);
		if (gridCheckPoint.x < 1 || gridCheckPoint.x > (this.width-1) ||
			gridCheckPoint.y < 1 || gridCheckPoint.y > (this.height-1)) {
			bRVal = false;
		}
		else {
			let dstPoint = this.directionOffset(pos, dir, 2);
			bRVal = this.map[dstPoint.x][dstPoint.y] == tileType.WALL;
		}
		return bRVal;
	}

    fillDeadEnds() {
		for (let y = 1; y < this.height; y++) {
			for (let x = 1; x < this.width; x++) {
                this.checkAndFill(x,y);
			}
		}
	}

    checkAndFill(x,y) {
        if (this.map[x][y]==tileType.FLOOR) {
            let solidCount = 0;
            if (this.map[x-1][y] == tileType.WALL) { solidCount++; }
            if (this.map[x+1][y] == tileType.WALL) { solidCount++; }
            if (this.map[x][y-1] == tileType.WALL) { solidCount++; }
            if (this.map[x][y+1] == tileType.WALL) { solidCount++; }
            if (solidCount >= 3) {  //If there were blocks on three or four sides
                this.map[x][y] = tileType.WALL;
                this.checkAndFill(x-1,y); //We may have just made a neighbor a dead end
                this.checkAndFill(x+1,y); //Now we recursively call checkAndFill for all the neighbor blocks
                this.checkAndFill(x,y-1); 
                this.checkAndFill(x,y+1); 				
            }                        
        }
    }
    

    getOverlapTiles(objectHitBox) {
        let left = Math.max(0,Math.floor(objectHitBox.x/32));
        let right = Math.min(this.width,Math.ceil((objectHitBox.x+objectHitBox.width)/32));
        let top = Math.max(0,Math.floor(objectHitBox.y/32));
        let bottom = Math.min(this.height,Math.ceil((objectHitBox.y+objectHitBox.height)/32));
        let returnTiles = [];
        for (let x=left; x<right; x++){
            for (let y = top; y<bottom; y++) {
                returnTiles.push(this.map[x][y]);
            }
        }
        return returnTiles;
    }

    setMapTiles(left, top, width, height, type) {
        for(let x=left; x<left+width; x++) {
            for(let y=top; y<top+height; y++) {
                this.map[x][y] = type;
                this.regions2D[x][y] = this.currentRegion;
            }
        }
    }

    convertGridToSprites() {
        for(let x=0; x<this.width; x++) {
            for(let y=0; y<this.height; y++) {
                if(this.map[x][y] == tileType.FLOOR) {
                    this.map[x][y] = new randomGrayFloor(x*32+16,y*32+16);
                    this.map[x][y].hide();
                }
                else {
                    this.map[x][y] = new randomeBrickBrown(x*32+16,y*32+16);
                    this.map[x][y].hide();
                }
            }
        }

    }

    adjustMovingObject(object) {
try {
        let ObjHitBox = object.getHitBox();
        let mapTiles = this.getOverlapTiles(ObjHitBox);
        let adjust = new Point(0,0);
        let adjustObj = false;
        mapTiles.forEach((tile)=> { 
            if(tile.solid) { adjustObj = true;} 
        })
        if (adjustObj) {
            object.undoMove();
            let left=mapTiles[0].x;
            let right = mapTiles[0].x;
            let top = mapTiles[0].y;
            let bottom = mapTiles[0].y;
            mapTiles.forEach((tile)=> {
                if (tile.x < left) left = tile.x;
                if (tile.x > right) right = tile.x;
                if (tile.y < top) top = tile.y;
                if (tile.y > bottom) bottom = tile.y;
            }) 
            mapTiles.forEach((tile)=> {
                let tBox = tile.getHitBox();
                switch(object.getDirection()) {
                    case direction.LEFT:
                        if (tile.x == left && !tile.solid) adjust.y = tBox.y - ObjHitBox.y;
                        break;
                    case direction.RIGHT:
                        if (tile.x == right && !tile.solid) adjust.y = tBox.y - ObjHitBox.y;
                        break;
                    case direction.UP:
                        if (tile.y == top && !tile.solid) adjust.x = tBox.x - ObjHitBox.x;
                        break;
                    case direction.DOWN:
                        if (tile.y == bottom && !tile.solid) adjust.x = tBox.x - ObjHitBox.x;
                        break;
                    }
                }
            ) 
            if( adjust.x != 0 || adjust.y != 0) {
                if (Math.abs(adjust.x)<8 && Math.abs(adjust.y)<8)  { //Only adjust if we can, and if it is a small adjustment
                    object.move(adjust.x, adjust.y);
                }  
            }
        }
        return adjustObj;
    }
    catch (error) {
        console.log(object);
        console.error(error);
    }
}

    addDoors() {
        this.rooms.forEach((room) => {
            let box = room.gridBox;
            //Any halls on the top or bottom become doors
            for(let x=box.x; x<box.x+box.width; x++ ) {
                if (!this.map[x][box.y-1].solid) {this.doors.push(new Door(x,box.y-1))}
                if (!this.map[x][box.y+box.height].solid) {this.doors.push(new Door(x,box.y+box.height))}
            }
            //Any halls on the left or right become doors
            for(let y=box.y; y<box.y+box.height; y++ ) {
                if (!this.map[box.x-1][y].solid) {this.doors.push(new Door(box.x-1,y))}
                if (!this.map[box.x+box.width][y].solid) {this.doors.push(new Door(box.x+box.width,y))}
            }
        })
    }

        
    getRandomRoomPoint(roomIndex) {
        let rect = this.rooms[roomIndex].getHitBox();
        rect.expand(-32);
        return this.myRandom.ptInRect(rect.x, rect.y, rect.width, rect.height);
    }

    addStairsDown() {
        let pt = this.getRandomRoomPoint(this.myRandom.intBetween(1, this.rooms.length-1));
        this.stairsDown = new stairDown(pt.x, pt.y);
    }

    addStairsUp() {
        let pt = this.getRandomRoomPoint(0); //Player always is added to room 0
        this.stairsUp = new stairUp(pt.x, pt.y);
    }

    stairCollisions(hitBox) {
        let stairs = [];
        if ( this.stairsDown != null && this.stairsDown.getHitBox().overlap(hitBox) ) { stairs.push(this.stairsDown); }
        if (this.stairsUp != null && this.stairsUp.getHitBox().overlap(hitBox) )      { stairs.push(this.stairsUp); }
        return stairs;
    }

    draw(context) {
        for(let x=0; x<this.width; x++) {
            for(let y=0; y<this.height; y++) {
                this.map[x][y].draw(context);
            }
        }
        this.doors.forEach((door) => {door.draw(context);})
        if (this.stairsDown != null) { this.stairsDown.draw(context); }
        if (this.stairsUp != null) { this.stairsUp.draw(context); }
    }

    update(deltaTime) {
        /* If we ever use animated tiles for walls and floors we need to uncomment this code
        for(let x=0; x<this.width; x++) {
            for(let y=0; y<this.height; y++) {
                this.map[x][y].update(deltaTime);
            }
        } */
        this.doors.forEach((door) => {door.update(deltaTime);})
    }

    openHitDoor(hitBox) {
        this.doors.forEach((door) => {
            if (!door.isOpen && hitBox.overlap(door.getHitBox())) { door.open(); } 
        })
    }

    showOverlapingTiles(box) {
        let tiles = this.getOverlapTiles(box);
        tiles.forEach((tile) => {tile.show();});
        this.doors.forEach((door) => {
            if (box.overlap(door.getHitBox())) { door.show(); } 
        })
        if (this.stairsDown!= null && box.overlap(this.stairsDown.getHitBox())) {
            this.stairsDown.show(); 
        }
        if (this.stairsUp != null && box.overlap(this.stairsUp.getHitBox())) {
            this.stairsUp.show();
        }
    }

    getRoomFromPoint(pt) {
        let room = null;
        let i=0;
        while (room == null && i < this.rooms.length) {
            if ( this.rooms[i].containsPoint(pt) ) {room = this.rooms[i]; }
            i++;
        }
        return room;
    }

    showRoom(room) {
        let expandedRoom = room.getHitBox();
        expandedRoom.expand(31);
        this.showOverlapingTiles(expandedRoom);
    }

}

class Door extends doorHorizontal {
    constructor(x,y) {
        super(x*32+16,y*32+16);
        this.isOpen = false;
    }
    close() { this.frameX = 0; this.solid = true;}
    open() { this.frameX = 1; this.solid = false;}
}

class Room {
    constructor(x, y, width, height) {
        this.gridBox = new HitBox(x, y, width, height);
        this.x = x*32;
        this.y = y*32;
        this.width = width*32;
        this.height = height*32;
    }
    getHitBox() {
        return new HitBox(this.x, this.y, this.width, this.height);
    }

    containsPoint(pt) { 
        return this.x <= pt.x && (this.x+this.width) >= pt.x && this.y <= pt.y && (this.y + this.height) >= pt.y; 
    }

}