import CheckersAreaController from '../../../classes/CheckersAreaController';
import TownController from '../../../classes/TownController';
import Interactable, { KnownInteractableTypes } from '../Interactable';
import TownGameScene from '../TownGameScene';

export default class CheckersArea extends Interactable {
  private _townController: TownController;

  private _checkersAreaController?: CheckersAreaController;

  get checkersAreaController() {
    return this._checkersAreaController;
  }

  getType(): KnownInteractableTypes {
    return 'checkersArea';
  }

  constructor(scene: TownGameScene) {
    super(scene);
    this._townController = scene.coveyTownController;
    this.setTintFill();
    this.setAlpha(0.3);
  }

  overlap(): void {}

  overlapExit(): void {}

  addedToScene(): void {
    super.addedToScene();
    this.scene.add.text(
      this.x - this.displayWidth / 2,
      this.y - this.displayHeight / 2,
      this.name,
      { color: '#FFFFFF', backgroundColor: '#000000' },
    );
    this._checkersAreaController = this._townController.checkersArea;
  }
}
