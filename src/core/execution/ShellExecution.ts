import { Execution, Game, Player, Unit, UnitType } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { AirPathFinder } from "../pathfinding/PathFinding";
import { PseudoRandom } from "../PseudoRandom";

export class ShellExecution implements Execution {
  private active = true;
  private pathFinder: AirPathFinder;
  private shell: Unit | undefined;
  private mg: Game;
  private destroyAtTick: number = -1;

  constructor(
    private spawn: TileRef,
    private _owner: Player,
    private ownerUnit: Unit,
    private target: Unit,
  ) {}

  init(mg: Game, ticks: number): void {
    this.pathFinder = new AirPathFinder(mg, new PseudoRandom(mg.ticks()));
    this.mg = mg;
  }

  tick(ticks: number): void {
    this.shell ??= this._owner.buildUnit(UnitType.Shell, this.spawn, {});
    if (!this.shell.isActive()) {
      this.active = false;
      return;
    }
    if (
      !this.target.isActive() ||
      this.target.owner() === this.shell.owner() ||
      (this.destroyAtTick !== -1 && this.mg.ticks() >= this.destroyAtTick)
    ) {
      this.shell.delete(false);
      this.active = false;
      return;
    }

    if (this.destroyAtTick === -1 && !this.ownerUnit.isActive()) {
      this.destroyAtTick = this.mg.ticks() + this.mg.config().shellLifetime();
    }

    for (let i = 0; i < 3; i++) {
      const result = this.pathFinder.nextTile(
        this.shell.tile(),
        this.target.tile(),
      );
      if (result === true) {
        this.active = false;
        this.target.modifyHealth(-this.effectOnTarget(), this._owner);
        this.shell.setReachedTarget();
        this.shell.delete(false);
        return;
      } else {
        this.shell.move(result);
      }
    }
  }

  private effectOnTarget(): number {
    const { damage } = this.mg.config().unitInfo(UnitType.Shell);
    return damage ?? 0;
  }

  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
