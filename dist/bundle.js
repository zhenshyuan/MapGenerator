  Main.prototype.loadDefaultParams = function (jsonUrl) {
    var _this = this;
    return fetch(jsonUrl).then(function (r) {
      return r.json();
    }).then(function (params) {
      var gui = _this.mainGui;
      if (params.coastlineParams) {
        Object.assign(gui.coastlineParams, params.coastlineParams);
      }
      if (params.mainParams) {
        Object.assign(gui.mainParams, params.mainParams);
      }
      if (params.majorParams) {
        Object.assign(gui.majorParams, params.majorParams);
      }
      if (params.minorParams) {
        Object.assign(gui.minorParams, params.minorParams);
      }
      util_1["default"].updateGui(_this.roadsFolder);
    })["catch"](function (e) {
      log.error('Failed to load parameters', e);
    });
  };

  var app = new Main();
  window.mapGeneratorApp = app;   // expose for custom HTML
      if (params.generateOptions) {
        if (typeof params.generateOptions.water !== 'undefined') {
          gui.generateWater = params.generateOptions.water;
        }
        if (typeof params.generateOptions.main !== 'undefined') {
          gui.generateMainRoads = params.generateOptions.main;
        }
        if (typeof params.generateOptions.major !== 'undefined') {
          gui.generateMajorRoads = params.generateOptions.major;
        }
        if (typeof params.generateOptions.minor !== 'undefined') {
          gui.generateMinorRoads = params.generateOptions.minor;
        }
        if (typeof params.generateOptions.buildings !== 'undefined') {
          gui.generateBuildings = params.generateOptions.buildings;
        }
      }
    this.generateWater = true;
    this.generateMainRoads = true;
    this.generateMajorRoads = true;
    this.generateMinorRoads = true;
    this.generateBuildings = true;
    guiFolder.add(this, 'generateWater');
    guiFolder.add(this, 'generateMainRoads');
    guiFolder.add(this, 'generateMajorRoads');
    guiFolder.add(this, 'generateMinorRoads');
    guiFolder.add(this, 'generateBuildings');
  MainGUI.prototype.clearWater = function () {
    this.coastline.clearStreamlines();
    this.mainRoads.clearStreamlines();
    this.majorRoads.clearStreamlines();
    this.minorRoads.clearStreamlines();
    this.bigParks = [];
    this.smallParks = [];
    this.buildings.reset();
    this.tensorField.parks = [];
    this.tensorField.sea = [];
    this.tensorField.river = [];
  };

  MainGUI.prototype.clearMain = function () {
    this.mainRoads.clearStreamlines();
    this.majorRoads.clearStreamlines();
    this.minorRoads.clearStreamlines();
    this.bigParks = [];
    this.smallParks = [];
    this.buildings.reset();
    this.tensorField.parks = [];
  };

  MainGUI.prototype.clearMajor = function () {
    this.majorRoads.clearStreamlines();
    this.minorRoads.clearStreamlines();
    this.bigParks = [];
    this.smallParks = [];
    this.buildings.reset();
    this.tensorField.parks = [];
  };

  MainGUI.prototype.clearMinor = function () {
    this.minorRoads.clearStreamlines();
    this.smallParks = [];
    this.buildings.reset();
    this.tensorField.parks = this.bigParks;
  };

            if (this.generateWater) {
              this.coastline.generateRoads();
            } else {
              this.clearWater();
            }
            if (!this.generateMainRoads) return [3, 2];
            return [3, 3];
          case 2:
            this.clearMain();
            _a.label = 3;
          case 3:
            if (!this.generateMajorRoads) return [3, 5];
          case 4:
            return [3, 6];
          case 5:
            this.clearMajor();
            _a.label = 6;
          case 6:
            if (!this.generateMinorRoads) return [3, 8];
          case 7:
            return [3, 9];
          case 8:
            this.clearMinor();
            _a.label = 9;
          case 9:
            if (!this.generateBuildings) return [3, 11];
          case 10:
            return [3, 12];
          case 11:
            this.buildings.reset();
            _a.label = 12;
          case 12:
