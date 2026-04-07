"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbroideryModule = void 0;
const common_1 = require("@nestjs/common");
const embroidery_controller_1 = require("./embroidery.controller");
const embroidery_service_1 = require("./embroidery.service");
let EmbroideryModule = class EmbroideryModule {
};
exports.EmbroideryModule = EmbroideryModule;
exports.EmbroideryModule = EmbroideryModule = __decorate([
    (0, common_1.Module)({
        controllers: [embroidery_controller_1.EmbroideryController],
        providers: [embroidery_service_1.EmbroideryService],
        exports: [embroidery_service_1.EmbroideryService],
    })
], EmbroideryModule);
//# sourceMappingURL=embroidery.module.js.map