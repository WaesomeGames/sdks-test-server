import { type Client, generateId, Room } from "@colyseus/core";
import { MapSchema, Schema, type } from "@colyseus/schema";


class Item extends Schema {
  @type("string") name?: string;
  @type("number") value?: number;
}
class Cargo extends Schema {
  @type("string") name: string = "";
  @type("number") amount: number = 0;
}
class Log extends Schema {
  @type("string") title?: string;
  @type("number") timestamp?: number;
  @type("string") text?: string;
}
class Position extends Schema {
  @type("number") x = 0;
  @type("number") y = 0;
}
  
//State is a property of a ship
class State extends Schema {
  @type("string") name =  "";
} 

//Action is an instant thing to do
class Action extends Schema {
  @type("string") name = "";
  @type("number") rewardFactor = 1;
  @type(Position) newPosition = new Position;
  @type("string") endState = "";
  @type(Cargo) getCargo: Cargo = new Cargo;
  @type(Cargo) giveCargo: Cargo = new Cargo;
  @type("number") targetID = -1;
}

//task is the planning of an action, or it taking course slowly
class Task extends Schema {
  
  @type("string") name = "";
  @type("number") start = 0;
  @type("number") end = 0;
  @type("string") requiredState = "";
  @type(Position) requiredPosition = new Position;
  @type("number") targetID = -1;
  @type("boolean") partialRewards: boolean = false;
  @type("boolean") selfRepeat: boolean = false;
  @type("boolean") taskFailed: boolean = false;
  @type("boolean") taskCompleted: boolean = false;
  @type("boolean") waitOnFailed: boolean = true;
  @type("boolean") waitOnCompleted: boolean = false;
  @type(Action) taskAction = new Action;
}

class Behavior extends Schema{
  @type("string") name = "";
  @type([Task]) taskList: Task[] = [];
}

class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") isBot?: boolean;
  @type("boolean") disconnected?: boolean;
  @type([Item]) items: Item[] = [];
}
class Ship extends Schema {
  @type("string") name: string = "";
  @type("number") ID: number = -1;

  @type("number") x: number = 0;
  @type("number") y: number = 0;

  @type("number") ftlSpeed: number = 1;
  @type("number") sublightSpeed: number = 1;
  @type("number") ftlChargeTime: number = 100;
  @type("number") weaponChargeTime: number = 0;
  
  @type("number") miningPower: number = 1;
  @type("number") cargoSpace: number = 14;
  @type("number") logistics: number = 100;
  @type("number") combatStrength: number = 1;

  @type("string") state  = "";
  @type("string") statusMessage  = "";

  @type("number") dockedStationID = -1;
  @type("number") dockedPoiID = -1;

  @type({ map: Cargo })  cargo = new MapSchema<Cargo>();
  @type([Log]) logs: Log[] = [];
  @type([Task]) pastTasks: Task[] = [];
  @type(Task) currentTask = new Task();
  @type([Task]) queuedTasks: Task[] = [];

  @type(Behavior) behavior = new Behavior;
  
  @type("boolean") isStation = false;
  @type("boolean") isPOI = false;
}
/*class POI extends Schema {
  @type("string") name: string = "";
  @type("number") ID: number = 0;

  @type("number") x: number = 0;
  @type("number") y: number = 0;
  
  @type("number") miningWork: number = 0;

  @type([Cargo]) cargo: Cargo[] = [];
  @type([Log]) logs: Log[] = [];
}

class Station extends Schema {
  @type("string") name: string = "";
  @type("number") ID: number = 0;

  @type("number") x: number = 0;
  @type("number") y: number = 0;
  
  @type("number") cargoSpace: number = 0;
  @type("number") combatStrength: number = 0;

  @type([Cargo]) cargo: Cargo[] = [];
  @type([Log]) logs: Log[] = [];
}
*/
class MyRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Ship }) ships = new MapSchema<Ship>();
  //@type({ map: Station }) stations = new MapSchema<Station>();
  //@type({ map: POI }) pois = new MapSchema<POI>();
  @type(Player) host?: Player;
  @type("string") currentTurn?: string;
}

/**
 * Room definition
 * ----------------
 */
export class MyRoom extends Room {
  state = new MyRoomState();

  messages = {
    move: (client: Client, message: { x: number, y: number }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.x = message.x;
      player.y = message.y;
    },
    add_item: (client: Client, message: { name: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.items.push(new Item().assign({ name: message.name }));
    },
    remove_item: (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      if (player.items.length === 0) return;

      const randomIndex = Math.floor(Math.random() * player.items.length);
      player.items.splice(randomIndex, 1);
    },
    add_bot: (client: Client) => {
      const botId = generateId();
      this.state.players.set(botId, new Player().assign({
        isBot: true,
        x: Math.random() * 800,
        y: Math.random() * 600,
      }));
    },
    remove_bot: (client: Client, message: { name: string }) => {
      const bot = this.state.players.entries().find(([_, player]) => player.isBot)
      if (bot) {
        this.state.players.delete(bot[0]);
      }
    },

    create_station: (client: Client, message: { name: string , x : number, y : number}) => {
    const station = new Ship();
    station.isStation = true;
    station.x = message.x;
    station.y = message.y;
    station.ID = this.state.ships.size
    station.name = message.name;
    station.cargoSpace = 500;
    station.ftlSpeed = 0;
    station.sublightSpeed = 0;
    let cargo : Cargo = new Cargo;
    cargo.name = "minerals"
    cargo.amount = 100;
    this.state.ships.set(String(station.ID) , station);
  console.log("Created station" + station.name + " " + String(station.ID))
    },
    
    create_ship: (client: Client, message: { name: string, x : number, y : number }) => {
    const ship = new Ship();
    ship.x = message.x;
    ship.y = message.y;
    ship.ID = this.state.ships.size
    ship.name = message.name;
    this.state.ships.set(String(ship.ID), ship);
  console.log("Created ship" + ship.name + " " + String(ship.ID))
    }, 

    create_POI: (client: Client, message: { name: string, x : number, y : number }) => {
    const poi = new Ship();
    poi.isPOI = true;
    poi.x = message.x;
    poi.y = message.y;
    let minerals : Cargo = new Cargo;
    minerals.name = "minerals";
    minerals.amount = 1000;
    poi.cargo.set("minerals", minerals);
    poi.ID = this.state.ships.size
    poi.name = message.name;
  console.log("Created POI " + poi.name + " " + String(poi.ID))
    this.state.ships.set(String(poi.ID), poi);
    },

    
    move_command: (client: Client, message: { shipID: number, x : number, y : number, queued : boolean  }) => {
    const task = new Task();
    task.partialRewards = true;
    task.requiredState = "ftl charged";
    const action = new Action();
    action.newPosition.x = message.x;
    action.newPosition.y = message.y;
    action.endState = "";
    action.name = "move";
    task.taskAction = action;
    task.name = "move";
    const ship = this.state.ships.get(String(message.shipID));
    chain_tasks(ship,task, new Ship, message.queued);
    },

    mine_command: (client: Client, message: { shipID: number, asteroidID : number, queued : boolean }) => {
    const task = new Task();
    task.partialRewards = true;
    task.requiredState = "hardpoints deployed";
    task.targetID = message.asteroidID;
    const asteroid = this.state.ships.get(String(message.asteroidID));
   if (asteroid.isPOI == false)
    {
      return
    }
    task.requiredPosition.x = asteroid.x;
    task.requiredPosition.y = asteroid.y;
    const action = new Action();
    action.endState = "hardpoints deployed";
    let reward : Cargo = new Cargo;
    reward.name = "minerals";
    reward.amount = 10;
    action.getCargo = reward;
    action.targetID = message.asteroidID;
    task.targetID = message.asteroidID
    task.taskAction = action;
    task.name = "mine";
    task.selfRepeat = true;
    task.waitOnFailed = false;
    task.waitOnCompleted = false;
    const ship = this.state.ships.get(String(message.shipID));
    const target = this.state.ships.get(String(message.asteroidID));
    console.log("Mine command :  " + ship.name + " " + String(ship.ID) + " will mine "+ target.name + " " + String(target.ID) )
    chain_tasks(ship,task,target,message.queued);
    },

    dock_command: (client: Client, message: { shipID: number, stationID : number, queued : boolean  }) => {
    const task = new Task();
    task.targetID = message.stationID;
    const station = this.state.ships.get(String(message.stationID));
    if (station.isStation == false)
    {
      return
    }
    task.requiredPosition.x = station.x;
    task.requiredPosition.y = station.y;
    const action = new Action();
    action.endState = "docked";
    action.targetID = message.stationID;
    task.taskAction = action;
    task.name = "dock";
    const ship = this.state.ships.get(String(message.shipID));
    const target = this.state.ships.get(String(message.stationID));
    chain_tasks(ship,task, target, message.queued);
    },

    give_cargo_command :(client: Client, message: { shipID: number, stationID : number, cargoName : string, cargoAmount : number, queued : boolean  }) => {
    const task = new Task();
    task.targetID = message.stationID;
    const station = this.state.ships.get(String(message.stationID));
    task.requiredPosition.x = station.x;
    task.requiredPosition.y = station.y;
    task.requiredState = "docked";
    const action = new Action();
    action.endState = "docked";
    action.targetID = message.stationID;
    let givenCargo : Cargo = new Cargo;
    givenCargo.name = message.cargoName;
    givenCargo.amount = message.cargoAmount; //if negative means drop all cargo
    action.giveCargo = givenCargo;
    task.taskAction = action;
    task.selfRepeat = true;
    task.waitOnCompleted = false;
    task.waitOnFailed = true
    task.name = "transfer cargo";
    const ship = this.state.ships.get(String(message.shipID));
    const target = this.state.ships.get(String(message.stationID));
    chain_tasks(ship,task,target,message.queued);
    },
  }
  
  onCreate() {
    // broadcast "weather" event every 4 seconds
    this.clock.setInterval(() => {
      const weather = ["sunny", "cloudy", "rainy", "snowy"];
      this.broadcast("weather", { weather: weather[Math.floor(Math.random() * weather.length)] });
    }, 4000);
    this.clock.setInterval(() => {
      
      //check for ships with empty current task and a queued task
      this.state.ships.forEach(ship => {
        //Check for current task completion
        if (ship.currentTask.name != "")
        {
          console.log("checking on active task");
          console.log(ship.currentTask.name);
            if (this.clock.currentTime > ship.currentTask.end)
            {
              console.log("task completed");
              let target : Ship = new Ship;
              if (ship.currentTask.taskAction.targetID >= 0)
              {
                 target = this.state.ships.get(String(ship.currentTask.taskAction.targetID))
              }
              //console.log(String(ship.currentTask.taskAction.targetID));
              //console.log(ship.name + " " + String(ship.ID) + " doing action " + ship.currentTask.taskAction.name + " to " + target.name + " " + String(target.ID));
              do_action(ship, ship.currentTask.taskAction, target)
              if (ship.currentTask.selfRepeat)
              {
               
               if (!ship.currentTask.waitOnCompleted && ship.currentTask.taskCompleted)
               {ship.currentTask = new Task;}
               else if (!ship.currentTask.waitOnFailed && ship.currentTask.taskFailed)
               {ship.currentTask = new Task;}
               else
               { pepare_task(ship, ship.currentTask, this.clock.currentTime)}
              }
              else
              {
                ship.currentTask = new Task;
              }
            }
        }
        //set next task in queue to current task
        if (ship.currentTask.name == "")
        {
          if (ship.queuedTasks.length != 0)
          {
            pepare_task(ship,ship.queuedTasks.shift(),this.clock.currentTime);
          }
          else if (ship.behavior.taskList.length != 0)
          {
            ship.behavior.taskList.forEach(command => {
               let target : Ship = this.state.ships.get(String(ship.currentTask.taskAction.targetID))
               if (target === undefined)
               {
                target = new Ship;
               }
                   chain_tasks(ship, command, target, true);
                   
            });
          }
        }
        
        
      });
    }, 300);

  }

  onJoin(client: Client) {
    const player = new Player();
    player.items.push(new Item().assign({ name: "sword" }));

    if (!this.state.host) {
      this.state.host = player;
      this.state.currentTurn = client.sessionId;
    }

    this.state.players.set(client.sessionId, player);

    // advance turn every 2 seconds
    this.clock.setInterval(() => {
      const sessionIds = Array.from(this.state.players.keys());
      const nextSessionId = sessionIds.find(sessionId => sessionId === this.state.currentTurn);
      this.state.currentTurn = nextSessionId;
    }, 2000);

    // move bots
    this.setSimulationInterval(() => {
      this.state.players.forEach(player => {
        if (player.isBot) {
          player.x += Math.random() * 10 - 5;
          player.y += Math.random() * 10 - 5;
        }
      });
    });
  }

  async onDrop(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.disconnected = true;
    }
    await this.allowReconnection(client, 10);
  }

  onReconnect(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.disconnected = false;
    }
  }

  onLeave(client: Client, code?: number) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.state.players.delete(client.sessionId);

      // if the player is the host, assign a new host
      if (this.state.host === player && this.state.players.size > 0) {
        this.state.host = this.state.players.values().next().value;
      }
    }
  }
}


function do_action(ship : Ship, action : Action, target : Ship)
{
  if (action.name == "move")
  {
   console.log("moving to x : " + String(action.newPosition.x) + " y : " + String(action.newPosition.y))
   ship.x = action.newPosition.x + (5-Math.random()*10);
   ship.y = action.newPosition.y+ (5-Math.random()*10);
  }
  if (action.name == "dock")
  {
    if (target.isStation)
    {
      ship.dockedStationID = target.ID
    }
    if (target.isPOI)
    {
      ship.dockedPoiID = target.ID
    }
  }
  if (action.name == "undock")
  {
    ship.dockedPoiID = -1;
    ship.dockedStationID = -1
  }
   ship.state = action.endState;
   //cargo transfer between ships/stations/POIs
    if (action.giveCargo.amount > 0 ||  action.getCargo.amount > 0 )
    {
      let cargo : Cargo;
      let giver : Ship;
      let taker : Ship;
      if (action.giveCargo.amount > 0)
      {
          giver  = ship;
          taker  = target;
          cargo = action.giveCargo
      }
        if (action.getCargo.amount > 0)
      {
          giver  = target;
          taker  = ship;
          cargo = action.getCargo
      }
    console.log("Transfering Cargo " + String(cargo.amount ) + " " +cargo.name )
      console.log("giver " + giver.name + " " +String(giver.ID) + " taker " + taker.name+ " " +String(taker.ID) )
      //can we give that much cargo
      let cargoInGiver : Cargo = giver.cargo.get(String(cargo.name));
      let amountOfThisCargoInGiver : number;
      if ( cargoInGiver === undefined) //giver doesn't have this cargo
      {
        console.log("No cargo to give")
        amountOfThisCargoInGiver = 0;
        
        //if I try to give but have none, I finished
        if (action.giveCargo.amount > 0)
        {
           ship.currentTask.taskCompleted = true;
        }
        else //if I try to take but it's empty, I failed (might wait and try again)
        {
            ship.currentTask.taskFailed = true;
        }
        return
      }
      amountOfThisCargoInGiver = cargoInGiver.amount;
      let givenCargoAmount : number = Math.min(cargo.amount,amountOfThisCargoInGiver );
       //target has room for cargo
      let cargoSpaceOfTaker : number = taker.cargoSpace - getCargoAmount(taker.cargo);
      givenCargoAmount = Math.min(givenCargoAmount, cargoSpaceOfTaker)
      if (cargoSpaceOfTaker == 0)
      {
        console.log("No room to take on cargo")
        //if I try to give but container is full, it's not complete and it failed (might wait and try again)
        if (action.giveCargo.amount > 0)
        {
           ship.currentTask.taskFailed = true;
        }
        else //if I try to take but my hold is full, my task is completed
        {
            ship.currentTask.taskCompleted = true;
        }

      }
      let newGiverCargo : Cargo = new Cargo;
      newGiverCargo.name = cargo.name;
      newGiverCargo.amount = amountOfThisCargoInGiver - givenCargoAmount;
      if (newGiverCargo.amount <= 0)
      {
        giver.cargo.delete(cargo.name);
      }
      else
      {
        giver.cargo.set(cargo.name, newGiverCargo)
      }
      let cargoInTaker : Cargo = taker.cargo.get(String(cargo.name));

      let amountOfThisCargoInTaker : number ;
      if ( cargoInTaker === undefined) //taker doesn't have this cargo
      {
          amountOfThisCargoInTaker = 0;
      }
      else
      {
          amountOfThisCargoInTaker = cargoInTaker.amount;
      }
      let newTakerCargo : Cargo = new Cargo;
      newTakerCargo.name = cargo.name;
      newTakerCargo.amount = amountOfThisCargoInTaker + givenCargoAmount;
      taker.cargo.set(cargo.name, newTakerCargo)
      console.log("Transfered " + String(givenCargoAmount) + " " +cargo.name )
      
   }

}

//Prepares a task from the queue, calculating actual completion time
function pepare_task(ship : Ship, task : Task, currTime : number)
{
  task.start = currTime;
  if (task.name == "move")
  {
    if (ship.ftlSpeed == 0)
    {
      console.log("Cannot move a ship with 0 speed")
      ship.queuedTasks = [];
      ship.currentTask = new Task;
      return
    }
    let distance : number = Math.sqrt(Math.pow(ship.x - task.taskAction.newPosition.x,2) + Math.pow(ship.y - task.taskAction.newPosition.y,2));
    task.end = distance/ship.ftlSpeed*0 + task.start;
  }
  if (task.name == "charge ftl")
  {
    task.end = ship.ftlChargeTime + task.start;
  }
  if (task.name == "deploy hardpoints")
  {
    task.end = ship.weaponChargeTime + task.start;
  }
  if (task.name == "retract hardpoints")
  {
    task.end = ship.weaponChargeTime/2 + task.start;
  }if (task.name == "dock")
  {
    task.end = 1000/ship.sublightSpeed + task.start;
  }
  if (task.name == "mine")
  {
    let minedAmount : number = task.taskAction.getCargo.amount;
    let cargoSpaceLeft : number = ship.cargoSpace - getCargoAmount(ship.cargo);
    minedAmount = Math.min(minedAmount,cargoSpaceLeft);
    task.end = 100/ship.sublightSpeed + 100.0*minedAmount/ship.miningPower + task.start;
  }
  if (task.name == "transfer cargo")
  {
    let transferedAmount : number = task.taskAction.getCargo.amount + task.taskAction.giveCargo.amount;
    10.0*transferedAmount/ship.logistics + task.start;
  }

  ship.currentTask = task;

}
function getCargoAmount(allCargo : MapSchema) : number
{
  let totalAmount : number = 0;
  allCargo.forEach(cargo => {
    totalAmount += cargo.amount;
  });
  return totalAmount
}
function chain_tasks(ship : Ship, task : Task, target : Ship, queue : boolean)
{
  //start from one task and figure out what other tasks are necessary 
  if (queue != true)
  {
    ship.queuedTasks = [];
  }
  let positionAtTask : Position = new Position;
  
  positionAtTask.x = ship.x;
  positionAtTask.y = ship.y;
  if (ship.queuedTasks.length != 0)
  {
    positionAtTask= ship.queuedTasks.at(-1).taskAction.newPosition;
  }
  if (task.requiredPosition.x != 0)
  {
    
    let distance : number = Math.sqrt(Math.pow(ship.x - task.requiredPosition.x,2) + Math.pow(ship.y - task.requiredPosition.y,2));
     //need to move to position 
    if (distance > 10)
    {
      const move_task = new Task();
      move_task.partialRewards = true;
      move_task.requiredState = "ftl charged";
      const action = new Action();
      action.newPosition = task.requiredPosition;
      action.endState = "";
      action.name = "move";
      move_task.taskAction = action;
      move_task.name = "move";
      
      console.log("adding move to chain")
      chain_tasks(ship, move_task, target, true)
    }
  }
  let stateAtTask : string;
  if (ship.queuedTasks.length == 0)
  {
    stateAtTask = ship.state;
  }
  else
  {
    stateAtTask= ship.queuedTasks.at(-1).taskAction.endState;
  }
   //need to change ship state
  if (task.requiredState != stateAtTask)
  {
    if (task.requiredState == "ftl charged")
    {
      const chargeFtlTask = new Task();
      chargeFtlTask.requiredState = "";
      const action = new Action();
      action.endState = "ftl charged";
      chargeFtlTask.taskAction = action;
      chargeFtlTask.name = "charge ftl";
      
      console.log("adding charge ftl to chain")
      chain_tasks(ship, chargeFtlTask,target, true)
    }
    if (task.requiredState == "hardpoints deployed")
    {
      const deployHardpointsTask = new Task();
      deployHardpointsTask.requiredState = "";
      const action = new Action();
      action.endState = "hardpoints deployed";
      deployHardpointsTask.taskAction = action;
      deployHardpointsTask.name = "deploy hardpoints";
      
      console.log("adding deploy hardpoints to chain")
      chain_tasks(ship, deployHardpointsTask,target, true)
    }
    if (task.requiredState == "docked")
    {
      const dockTask = new Task();
      dockTask.requiredState = "";
      const action = new Action();
      action.endState = "docked";
      action.targetID = target.ID;
      dockTask.taskAction = action;
      dockTask.name = "dock";
      
      console.log("adding dock to chain")
      chain_tasks(ship, dockTask,target, true)
    }
    if (task.requiredState == "")
    {
      if (stateAtTask == "ftl charged")
      {
        const depowerFtlTask = new Task();
        depowerFtlTask.requiredState = "ftl charged";
        const action = new Action();
        action.endState = "";
        depowerFtlTask.taskAction = action;
        depowerFtlTask.name = "depower ftl";
        
      console.log("adding depower ftl to chain")
        chain_tasks(ship, depowerFtlTask,target,  true)
      }
      if (stateAtTask == "hardpoints deployed")
      {
        const retractHardpointsTask = new Task();
        retractHardpointsTask.requiredState = "hardpoints deployed";
        const action = new Action();
        action.endState = "";
        retractHardpointsTask.taskAction = action;
        retractHardpointsTask.name = "retract hardpoints";
        
      console.log("ading retract hardpoints to chain")
        chain_tasks(ship, retractHardpointsTask, target, true)
      }
      if (stateAtTask == "docked")
      {
        const dockTask = new Task();
        dockTask.requiredState = "docked";
        const action = new Action();
        action.endState = "";
        action.targetID = target.ID;
        dockTask.taskAction = action;
        dockTask.name = "undock";
        
        console.log("adding undock to chain")
        chain_tasks(ship, dockTask,target, true)
      }
    }
  }
  ship.queuedTasks.push(task)
}