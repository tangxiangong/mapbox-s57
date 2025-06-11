import type { GeoJSON } from 'geojson';

// S-57 标准对象类型
export type S57ObjectType =
    | 'COALNE'  // 海岸线
    | 'DEPARE'  // 水深区域
    | 'SOUNDG'  // 测深点
    | 'OBSTRN'  // 障碍物
    | 'LIGHTS'  // 灯塔/信号灯
    | 'BUOYAGE' // 浮标系统
    | 'NAVAID'  // 助航设施
    | 'LNDARE'  // 陆地区域
    | 'SEAARE'  // 海域区域
    | 'UNSARE'  // 不安全区域
    | 'RESARE'  // 限制区域
    | 'ACHARE'  // 锚地区域
    | 'BCNCAR'  // 立标
    | 'BCNISD'  // 孤立危险物立标
    | 'BCNLAT'  // 侧面标志立标
    | 'BCNSAW'  // 安全水域立标
    | 'BCNSPP'  // 特殊用途标志立标
    | 'BOYCAR'  // 基本浮标
    | 'BOYINB'  // 装置浮标
    | 'BOYISD'  // 孤立危险物浮标
    | 'BOYLAT'  // 侧面标志浮标
    | 'BOYSAW'  // 安全水域浮标
    | 'BOYSPP'; // 特殊用途标志浮标

// S-57 几何类型
export type S57GeometryType = 'Point' | 'Line' | 'Area';

// S-57 要素属性
export interface S57Attributes {
    // 通用属性
    OBJNAM?: string;  // 对象名称
    NOBJNM?: string;  // 国家对象名称
    INFORM?: string;  // 信息
    NINFOM?: string;  // 国家信息
    SCAMAX?: number;  // 最大比例尺
    SCAMIN?: number;  // 最小比例尺

    // 水深相关
    DRVAL1?: number;  // 深度值1
    DRVAL2?: number;  // 深度值2
    VALDCO?: number;  // 水深值
    QUASOU?: number;  // 测深质量
    TECSOU?: number;  // 测深技术

    // 高度相关
    HEIGHT?: number;  // 高度
    ELEVAT?: number;  // 标高
    VERCSA?: number;  // 垂直间隙安全高度
    VERDAT?: number;  // 垂直基准面

    // 灯光相关
    COLOUR?: number[];  // 颜色
    COLPAT?: number;    // 颜色模式
    LITCHR?: number;    // 灯质
    SIGPER?: number;    // 信号周期
    SIGGRP?: string;    // 信号组
    RANGE?: number;     // 射程
    VALNMR?: number;    // 数值

    // 状态相关
    STATUS?: number;    // 状态
    CONVIS?: number;    // 视觉突出度
    CONDTN?: number;    // 状况

    // 位置相关
    CATPOS?: number;    // 位置类别

    // 其他属性
    [key: string]: string | number | number[] | undefined;
}

// S-57 要素
export interface S57Feature {
    id: string;
    objectType: S57ObjectType;
    geometryType: S57GeometryType;
    geometry: GeoJSON.Geometry;
    attributes: S57Attributes;
    metadata: S57Metadata;
}

// S-57 元数据
export interface S57Metadata {
    recordId: number;
    recordVersion: number;
    updateInstruction: 'INSERT' | 'DELETE' | 'MODIFY';
    sourceFile: string;
    compilationScale: number;
    dataSetIdentificationNumber: string;
    editionNumber: number;
    updateNumber: number;
    issueDate: string;
    agencyCode: number;
    comment?: string;
}

// S-57 数据集
export interface S57Dataset {
    metadata: S57DatasetMetadata;
    features: S57Feature[];
    spatialReference: string;
    bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

// S-57 数据集元数据
export interface S57DatasetMetadata {
    dataSetIdentificationNumber: string;
    editionNumber: number;
    updateNumber: number;
    updateApplicationDate: string;
    issueDate: string;
    productSpecification: string;
    productSpecificationEdition: string;
    productSpecificationAmendmentNumber: number;
    agencyCode: number;
    producingAgency: string;
    comment?: string;
    compilationScale: number;
    mapUnits: string;
    coordinateUnits: string;
    soundingDatum: string;
    verticalDatum: string;
    horizontalDatum: string;
}

// 验证规则
export interface ValidationRule {
    name: string;
    description: string;
    objectTypes?: S57ObjectType[];
    severity: 'error' | 'warning' | 'info';
    validate: (feature: S57Feature) => ValidationResult;
}

// 验证结果
export interface ValidationResult {
    valid: boolean;
    messages: ValidationMessage[];
}

export interface ValidationMessage {
    severity: 'error' | 'warning' | 'info';
    message: string;
    featureId?: string;
    attribute?: string;
} 