// MTR Next Train API Types
// Based on: https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.7.pdf

export enum MTRLine {
  // Airport Express Line
  AEL = 'AEL',
  // Tung Chung Line  
  TCL = 'TCL',
  // Tuen Ma Line
  TML = 'TML',
  // Tseung Kwan O Line
  TKL = 'TKL',
  // East Rail Line
  EAL = 'EAL',
  // South Island Line
  SIL = 'SIL',
  // Tsuen Wan Line
  TWL = 'TWL',
  // Island Line
  ISL = 'ISL',
  // Kwun Tong Line
  KTL = 'KTL',
  // Disneyland Resort Line
  DRL = 'DRL'
}

export enum MTRStation {
  // Airport Express Line (AEL)
  HOK = 'HOK', // Hong Kong
  KOW = 'KOW', // Kowloon
  TSY = 'TSY', // Tsing Yi
  AIR = 'AIR', // Airport
  AWE = 'AWE', // AsiaWorld Expo

  // Tung Chung Line (TCL) - shares some stations with AEL
  OLY = 'OLY', // Olympic
  NAC = 'NAC', // Nam Cheong
  LAK = 'LAK', // Lai King
  SUN = 'SUN', // Sunny Bay
  TUC = 'TUC', // Tung Chung

  // Tuen Ma Line (TML)
  WKS = 'WKS', // Wu Kai Sha
  MOS = 'MOS', // Ma On Shan
  HEO = 'HEO', // Heng On
  TSH = 'TSH', // Tai Shui Hang
  SHM = 'SHM', // Shek Mun
  CIO = 'CIO', // City One
  STW = 'STW', // Sha Tin Wai
  CKT = 'CKT', // Che Kung Temple
  TAW = 'TAW', // Tai Wai
  HIK = 'HIK', // Hin Keng
  DIH = 'DIH', // Diamond Hill
  KAT = 'KAT', // Kai Tak
  SUW = 'SUW', // Sung Wong Toi
  TKW = 'TKW', // To Kwa Wan
  HOM = 'HOM', // Ho Man Tin
  HUH = 'HUH', // Hung Hom
  ETS = 'ETS', // East Tsim Sha Tsui
  AUS = 'AUS', // Austin
  MEF = 'MEF', // Mei Foo
  TWW = 'TWW', // Tsuen Wan West
  KSR = 'KSR', // Kam Sheung Road
  YUL = 'YUL', // Yuen Long
  LOP = 'LOP', // Long Ping
  TIS = 'TIS', // Tin Shui Wai
  SIH = 'SIH', // Siu Hong
  TUM = 'TUM', // Tuen Mun

  // Tseung Kwan O Line (TKL)
  NOP = 'NOP', // North Point
  QUB = 'QUB', // Quarry Bay
  YAT = 'YAT', // Yau Tong
  TIK = 'TIK', // Tiu Keng Leng
  TKO = 'TKO', // Tseung Kwan O
  LHP = 'LHP', // LOHAS Park
  HAH = 'HAH', // Hang Hau
  POA = 'POA', // Po Lam

  // East Rail Line (EAL)
  ADM = 'ADM', // Admiralty
  EXC = 'EXC', // Exhibition Centre
  MKK = 'MKK', // Mong Kok East
  KOT = 'KOT', // Kowloon Tong
  SHT = 'SHT', // Sha Tin
  FOT = 'FOT', // Fo Tan
  RAC = 'RAC', // Racecourse
  UNI = 'UNI', // University
  TAP = 'TAP', // Tai Po Market
  TWO = 'TWO', // Tai Wo
  FAN = 'FAN', // Fanling
  SHS = 'SHS', // Sheung Shui
  LOW = 'LOW', // Lo Wu
  LMC = 'LMC', // Lok Ma Chau

  // South Island Line (SIL)
  OCP = 'OCP', // Ocean Park
  WCH = 'WCH', // Wong Chuk Hang
  LET = 'LET', // Lei Tung
  SOH = 'SOH', // South Horizons

  // Tsuen Wan Line (TWL)
  CEN = 'CEN', // Central
  TST = 'TST', // Tsim Sha Tsui
  JOR = 'JOR', // Jordan
  YMT = 'YMT', // Yau Ma Tei
  MOK = 'MOK', // Mong Kok
  PRE = 'PRE', // Prince Edward
  SSP = 'SSP', // Sham Shui Po
  CSW = 'CSW', // Cheung Sha Wan
  LCK = 'LCK', // Lai Chi Kok
  KWF = 'KWF', // Kwai Fong
  KWH = 'KWH', // Kwai Hing
  TWH = 'TWH', // Tai Wo Hau
  TSW = 'TSW', // Tsuen Wan

  // Island Line (ISL)
  KET = 'KET', // Kennedy Town
  HKU = 'HKU', // HKU
  SYP = 'SYP', // Sai Ying Pun
  SHW = 'SHW', // Sheung Wan
  WAC = 'WAC', // Wan Chai
  CAB = 'CAB', // Causeway Bay
  TIH = 'TIH', // Tin Hau
  FOH = 'FOH', // Fortress Hill
  TAK = 'TAK', // Tai Koo
  SWH = 'SWH', // Sai Wan Ho
  SKW = 'SKW', // Shau Kei Wan
  HFC = 'HFC', // Heng Fa Chuen
  CHW = 'CHW', // Chai Wan

  // Kwun Tong Line (KTL)
  WHA = 'WHA', // Whampoa
  SKM = 'SKM', // Shek Kip Mei
  LOF = 'LOF', // Lok Fu
  WTS = 'WTS', // Wong Tai Sin
  CHH = 'CHH', // Choi Hung
  KOB = 'KOB', // Kowloon Bay
  NTK = 'NTK', // Ngau Tau Kok
  KWT = 'KWT', // Kwun Tong
  LAT = 'LAT', // Lam Tin

  // Disneyland Resort Line (DRL)
  DIS = 'DIS'  // Disneyland Resort
}

export enum MTRLanguage {
  EN = 'EN', // English (Default)
  TC = 'TC'  // Traditional Chinese
}

// Line-Station mapping for validation
export const MTR_LINE_STATIONS: Record<MTRLine, MTRStation[]> = {
  [MTRLine.AEL]: [
    MTRStation.HOK, MTRStation.KOW, MTRStation.TSY, 
    MTRStation.AIR, MTRStation.AWE
  ],
  [MTRLine.TCL]: [
    MTRStation.HOK, MTRStation.KOW, MTRStation.OLY, MTRStation.NAC,
    MTRStation.LAK, MTRStation.TSY, MTRStation.SUN, MTRStation.TUC
  ],
  [MTRLine.TML]: [
    MTRStation.WKS, MTRStation.MOS, MTRStation.HEO, MTRStation.TSH,
    MTRStation.SHM, MTRStation.CIO, MTRStation.STW, MTRStation.CKT,
    MTRStation.TAW, MTRStation.HIK, MTRStation.DIH, MTRStation.KAT,
    MTRStation.SUW, MTRStation.TKW, MTRStation.HOM, MTRStation.HUH,
    MTRStation.ETS, MTRStation.AUS, MTRStation.NAC, MTRStation.MEF,
    MTRStation.TWW, MTRStation.KSR, MTRStation.YUL, MTRStation.LOP,
    MTRStation.TIS, MTRStation.SIH, MTRStation.TUM
  ],
  [MTRLine.TKL]: [
    MTRStation.NOP, MTRStation.QUB, MTRStation.YAT, MTRStation.TIK,
    MTRStation.TKO, MTRStation.LHP, MTRStation.HAH, MTRStation.POA
  ],
  [MTRLine.EAL]: [
    MTRStation.ADM, MTRStation.EXC, MTRStation.HUH, MTRStation.MKK,
    MTRStation.KOT, MTRStation.TAW, MTRStation.SHT, MTRStation.FOT,
    MTRStation.RAC, MTRStation.UNI, MTRStation.TAP, MTRStation.TWO,
    MTRStation.FAN, MTRStation.SHS, MTRStation.LOW, MTRStation.LMC
  ],
  [MTRLine.SIL]: [
    MTRStation.ADM, MTRStation.OCP, MTRStation.WCH, 
    MTRStation.LET, MTRStation.SOH
  ],
  [MTRLine.TWL]: [
    MTRStation.CEN, MTRStation.ADM, MTRStation.TST, MTRStation.JOR,
    MTRStation.YMT, MTRStation.MOK, MTRStation.PRE, MTRStation.SSP,
    MTRStation.CSW, MTRStation.LCK, MTRStation.MEF, MTRStation.LAK,
    MTRStation.KWF, MTRStation.KWH, MTRStation.TWH, MTRStation.TSW
  ],
  [MTRLine.ISL]: [
    MTRStation.KET, MTRStation.HKU, MTRStation.SYP, MTRStation.SHW,
    MTRStation.CEN, MTRStation.ADM, MTRStation.WAC, MTRStation.CAB,
    MTRStation.TIH, MTRStation.FOH, MTRStation.NOP, MTRStation.QUB,
    MTRStation.TAK, MTRStation.SWH, MTRStation.SKW, MTRStation.HFC,
    MTRStation.CHW
  ],
  [MTRLine.KTL]: [
    MTRStation.WHA, MTRStation.HOM, MTRStation.YMT, MTRStation.MOK,
    MTRStation.PRE, MTRStation.SKM, MTRStation.KOT, MTRStation.LOF,
    MTRStation.WTS, MTRStation.DIH, MTRStation.CHH, MTRStation.KOB,
    MTRStation.NTK, MTRStation.KWT, MTRStation.LAT, MTRStation.YAT,
    MTRStation.TIK
  ],
  [MTRLine.DRL]: [
    MTRStation.SUN, MTRStation.DIS
  ]
};

// API Response Types
export interface MTRTrainInfo {
  ttnt: string;      // Time to next train (minutes)
  valid: string;     // Valid flag (Y/N)
  plat: string;      // Platform number
  time: string;      // Arrival time (YYYY-MM-DD HH:mm:ss)
  source: string;    // Source station
  dest: string;      // Destination station
  seq: string;       // Sequence number
}

export interface MTRStationData {
  curr_time: string;
  sys_time: string;
  UP?: MTRTrainInfo[];
  DOWN?: MTRTrainInfo[];
}

export interface MTRScheduleResponse {
  sys_time: string;
  curr_time: string;
  data: Record<string, MTRStationData>;
  status?: number;
  message?: string;
  isdelay?: string;
  url?: string;
}

// Line Names/Descriptions
export const MTR_LINE_NAMES: Record<MTRLine, string> = {
  [MTRLine.AEL]: 'Airport Express',
  [MTRLine.TCL]: 'Tung Chung Line',
  [MTRLine.TML]: 'Tuen Ma Line',
  [MTRLine.TKL]: 'Tseung Kwan O Line',
  [MTRLine.EAL]: 'East Rail Line',
  [MTRLine.SIL]: 'South Island Line',
  [MTRLine.TWL]: 'Tsuen Wan Line',
  [MTRLine.ISL]: 'Island Line',
  [MTRLine.KTL]: 'Kwun Tong Line',
  [MTRLine.DRL]: 'Disneyland Resort Line'
};

// Station Names/Descriptions
export const MTR_STATION_NAMES: Record<MTRStation, string> = {
  // Airport Express Line (AEL)
  [MTRStation.HOK]: 'Hong Kong',
  [MTRStation.KOW]: 'Kowloon',
  [MTRStation.TSY]: 'Tsing Yi',
  [MTRStation.AIR]: 'Airport',
  [MTRStation.AWE]: 'AsiaWorld Expo',

  // Tung Chung Line (TCL)
  [MTRStation.OLY]: 'Olympic',
  [MTRStation.NAC]: 'Nam Cheong',
  [MTRStation.LAK]: 'Lai King',
  [MTRStation.SUN]: 'Sunny Bay',
  [MTRStation.TUC]: 'Tung Chung',

  // Tuen Ma Line (TML)
  [MTRStation.WKS]: 'Wu Kai Sha',
  [MTRStation.MOS]: 'Ma On Shan',
  [MTRStation.HEO]: 'Heng On',
  [MTRStation.TSH]: 'Tai Shui Hang',
  [MTRStation.SHM]: 'Shek Mun',
  [MTRStation.CIO]: 'City One',
  [MTRStation.STW]: 'Sha Tin Wai',
  [MTRStation.CKT]: 'Che Kung Temple',
  [MTRStation.TAW]: 'Tai Wai',
  [MTRStation.HIK]: 'Hin Keng',
  [MTRStation.DIH]: 'Diamond Hill',
  [MTRStation.KAT]: 'Kai Tak',
  [MTRStation.SUW]: 'Sung Wong Toi',
  [MTRStation.TKW]: 'To Kwa Wan',
  [MTRStation.HOM]: 'Ho Man Tin',
  [MTRStation.HUH]: 'Hung Hom',
  [MTRStation.ETS]: 'East Tsim Sha Tsui',
  [MTRStation.AUS]: 'Austin',
  [MTRStation.MEF]: 'Mei Foo',
  [MTRStation.TWW]: 'Tsuen Wan West',
  [MTRStation.KSR]: 'Kam Sheung Road',
  [MTRStation.YUL]: 'Yuen Long',
  [MTRStation.LOP]: 'Long Ping',
  [MTRStation.TIS]: 'Tin Shui Wai',
  [MTRStation.SIH]: 'Siu Hong',
  [MTRStation.TUM]: 'Tuen Mun',

  // Tseung Kwan O Line (TKL)
  [MTRStation.NOP]: 'North Point',
  [MTRStation.QUB]: 'Quarry Bay',
  [MTRStation.YAT]: 'Yau Tong',
  [MTRStation.TIK]: 'Tiu Keng Leng',
  [MTRStation.TKO]: 'Tseung Kwan O',
  [MTRStation.LHP]: 'LOHAS Park',
  [MTRStation.HAH]: 'Hang Hau',
  [MTRStation.POA]: 'Po Lam',

  // East Rail Line (EAL)
  [MTRStation.ADM]: 'Admiralty',
  [MTRStation.EXC]: 'Exhibition Centre',
  [MTRStation.MKK]: 'Mong Kok East',
  [MTRStation.KOT]: 'Kowloon Tong',
  [MTRStation.SHT]: 'Sha Tin',
  [MTRStation.FOT]: 'Fo Tan',
  [MTRStation.RAC]: 'Racecourse',
  [MTRStation.UNI]: 'University',
  [MTRStation.TAP]: 'Tai Po Market',
  [MTRStation.TWO]: 'Tai Wo',
  [MTRStation.FAN]: 'Fanling',
  [MTRStation.SHS]: 'Sheung Shui',
  [MTRStation.LOW]: 'Lo Wu',
  [MTRStation.LMC]: 'Lok Ma Chau',

  // South Island Line (SIL)
  [MTRStation.OCP]: 'Ocean Park',
  [MTRStation.WCH]: 'Wong Chuk Hang',
  [MTRStation.LET]: 'Lei Tung',
  [MTRStation.SOH]: 'South Horizons',

  // Tsuen Wan Line (TWL)
  [MTRStation.CEN]: 'Central',
  [MTRStation.TST]: 'Tsim Sha Tsui',
  [MTRStation.JOR]: 'Jordan',
  [MTRStation.YMT]: 'Yau Ma Tei',
  [MTRStation.MOK]: 'Mong Kok',
  [MTRStation.PRE]: 'Prince Edward',
  [MTRStation.SSP]: 'Sham Shui Po',
  [MTRStation.CSW]: 'Cheung Sha Wan',
  [MTRStation.LCK]: 'Lai Chi Kok',
  [MTRStation.KWF]: 'Kwai Fong',
  [MTRStation.KWH]: 'Kwai Hing',
  [MTRStation.TWH]: 'Tai Wo Hau',
  [MTRStation.TSW]: 'Tsuen Wan',

  // Island Line (ISL)
  [MTRStation.KET]: 'Kennedy Town',
  [MTRStation.HKU]: 'HKU',
  [MTRStation.SYP]: 'Sai Ying Pun',
  [MTRStation.SHW]: 'Sheung Wan',
  [MTRStation.WAC]: 'Wan Chai',
  [MTRStation.CAB]: 'Causeway Bay',
  [MTRStation.TIH]: 'Tin Hau',
  [MTRStation.FOH]: 'Fortress Hill',
  [MTRStation.TAK]: 'Tai Koo',
  [MTRStation.SWH]: 'Sai Wan Ho',
  [MTRStation.SKW]: 'Shau Kei Wan',
  [MTRStation.HFC]: 'Heng Fa Chuen',
  [MTRStation.CHW]: 'Chai Wan',

  // Kwun Tong Line (KTL)
  [MTRStation.WHA]: 'Whampoa',
  [MTRStation.SKM]: 'Shek Kip Mei',
  [MTRStation.LOF]: 'Lok Fu',
  [MTRStation.WTS]: 'Wong Tai Sin',
  [MTRStation.CHH]: 'Choi Hung',
  [MTRStation.KOB]: 'Kowloon Bay',
  [MTRStation.NTK]: 'Ngau Tau Kok',
  [MTRStation.KWT]: 'Kwun Tong',
  [MTRStation.LAT]: 'Lam Tin',

  // Disneyland Resort Line (DRL)
  [MTRStation.DIS]: 'Disneyland Resort'
};

// Helper function to validate line-station combination
export function isValidLineStation(line: MTRLine, station: MTRStation): boolean {
  return MTR_LINE_STATIONS[line]?.includes(station) ?? false;
}

// Helper function to get stations for a line
export function getStationsForLine(line: MTRLine): MTRStation[] {
  return MTR_LINE_STATIONS[line] ?? [];
}

// Helper function to get line name
export function getLineName(line: MTRLine): string {
  return MTR_LINE_NAMES[line] ?? line;
}

// Station Chinese Names
export const MTR_STATION_NAMES_TC: Record<MTRStation, string> = {
  // Airport Express Line (AEL)
  [MTRStation.HOK]: '香港',
  [MTRStation.KOW]: '九龍',
  [MTRStation.TSY]: '青衣',
  [MTRStation.AIR]: '機場',
  [MTRStation.AWE]: '博覽館',

  // Tung Chung Line (TCL)
  [MTRStation.OLY]: '奧運',
  [MTRStation.NAC]: '南昌',
  [MTRStation.LAK]: '荔景',
  [MTRStation.SUN]: '欣澳',
  [MTRStation.TUC]: '東涌',

  // Tuen Ma Line (TML)
  [MTRStation.WKS]: '烏溪沙',
  [MTRStation.MOS]: '馬鞍山',
  [MTRStation.HEO]: '恆安',
  [MTRStation.TSH]: '大水坑',
  [MTRStation.SHM]: '石門',
  [MTRStation.CIO]: '第一城',
  [MTRStation.STW]: '沙田圍',
  [MTRStation.CKT]: '車公廟',
  [MTRStation.TAW]: '大圍',
  [MTRStation.HIK]: '顯徑',
  [MTRStation.DIH]: '鑽石山',
  [MTRStation.KAT]: '啟德',
  [MTRStation.SUW]: '宋皇臺',
  [MTRStation.TKW]: '土瓜灣',
  [MTRStation.HOM]: '何文田',
  [MTRStation.HUH]: '紅磡',
  [MTRStation.ETS]: '尖東',
  [MTRStation.AUS]: '柯士甸',
  [MTRStation.MEF]: '美孚',
  [MTRStation.TWW]: '荃灣西',
  [MTRStation.KSR]: '錦上路',
  [MTRStation.YUL]: '元朗',
  [MTRStation.LOP]: '朗屏',
  [MTRStation.TIS]: '天水圍',
  [MTRStation.SIH]: '兆康',
  [MTRStation.TUM]: '屯門',

  // Tseung Kwan O Line (TKL)
  [MTRStation.NOP]: '北角',
  [MTRStation.QUB]: '鰂魚涌',
  [MTRStation.YAT]: '油塘',
  [MTRStation.TIK]: '調景嶺',
  [MTRStation.TKO]: '將軍澳',
  [MTRStation.LHP]: '康城',
  [MTRStation.HAH]: '坑口',
  [MTRStation.POA]: '寶琳',

  // East Rail Line (EAL)
  [MTRStation.ADM]: '金鐘',
  [MTRStation.EXC]: '會展',
  [MTRStation.MKK]: '旺角東',
  [MTRStation.KOT]: '九龍塘',
  [MTRStation.SHT]: '沙田',
  [MTRStation.FOT]: '火炭',
  [MTRStation.RAC]: '馬場',
  [MTRStation.UNI]: '大學',
  [MTRStation.TAP]: '大埔墟',
  [MTRStation.TWO]: '太和',
  [MTRStation.FAN]: '粉嶺',
  [MTRStation.SHS]: '上水',
  [MTRStation.LOW]: '羅湖',
  [MTRStation.LMC]: '落馬洲',

  // South Island Line (SIL)
  [MTRStation.OCP]: '海洋公園',
  [MTRStation.WCH]: '黃竹坑',
  [MTRStation.LET]: '利東',
  [MTRStation.SOH]: '海怡半島',

  // Tsuen Wan Line (TWL)
  [MTRStation.CEN]: '中環',
  [MTRStation.TST]: '尖沙咀',
  [MTRStation.JOR]: '佐敦',
  [MTRStation.YMT]: '油麻地',
  [MTRStation.MOK]: '旺角',
  [MTRStation.PRE]: '太子',
  [MTRStation.SSP]: '深水埗',
  [MTRStation.CSW]: '長沙灣',
  [MTRStation.LCK]: '荔枝角',
  [MTRStation.KWF]: '葵芳',
  [MTRStation.KWH]: '葵興',
  [MTRStation.TWH]: '大窩口',
  [MTRStation.TSW]: '荃灣',

  // Island Line (ISL)
  [MTRStation.KET]: '堅尼地城',
  [MTRStation.HKU]: '香港大學',
  [MTRStation.SYP]: '西營盤',
  [MTRStation.SHW]: '上環',
  [MTRStation.WAC]: '灣仔',
  [MTRStation.CAB]: '銅鑼灣',
  [MTRStation.TIH]: '天后',
  [MTRStation.FOH]: '炮台山',
  [MTRStation.TAK]: '太古',
  [MTRStation.SWH]: '西灣河',
  [MTRStation.SKW]: '筲箕灣',
  [MTRStation.HFC]: '杏花邨',
  [MTRStation.CHW]: '柴灣',

  // Kwun Tong Line (KTL)
  [MTRStation.WHA]: '黃埔',
  [MTRStation.SKM]: '石硤尾',
  [MTRStation.LOF]: '樂富',
  [MTRStation.WTS]: '黃大仙',
  [MTRStation.CHH]: '彩虹',
  [MTRStation.KOB]: '九龍灣',
  [MTRStation.NTK]: '牛頭角',
  [MTRStation.KWT]: '觀塘',
  [MTRStation.LAT]: '藍田',

  // Disneyland Resort Line (DRL)
  [MTRStation.DIS]: '迪士尼'
};

// Line Chinese Names
export const MTR_LINE_NAMES_TC: Record<MTRLine, string> = {
  [MTRLine.AEL]: '機場快綫',
  [MTRLine.TCL]: '東涌綫',
  [MTRLine.TML]: '屯馬綫',
  [MTRLine.TKL]: '將軍澳綫',
  [MTRLine.EAL]: '東鐵綫',
  [MTRLine.SIL]: '南港島綫',
  [MTRLine.TWL]: '荃灣綫',
  [MTRLine.ISL]: '港島綫',
  [MTRLine.KTL]: '觀塘綫',
  [MTRLine.DRL]: '迪士尼綫'
};

// Helper function to get station name
export function getStationName(station: MTRStation): string {
  return MTR_STATION_NAMES[station] ?? station;
}

// Helper function to get station Chinese name
export function getStationNameTC(station: MTRStation): string {
  return MTR_STATION_NAMES_TC[station] ?? station;
}

// Official MTR Line Colors (based on official route map)
export const MTR_LINE_COLORS: Record<MTRLine, string> = {
  [MTRLine.AEL]: '#00888A', // Teal/Dark Green
  [MTRLine.TCL]: '#F99D1C', // Orange
  [MTRLine.TML]: '#923A0A', // Brown
  [MTRLine.TKL]: '#7B3F99', // Purple
  [MTRLine.EAL]: '#5EB3E3', // Light Blue
  [MTRLine.SIL]: '#CBE300', // Yellow-Green
  [MTRLine.TWL]: '#E60012', // Red
  [MTRLine.ISL]: '#004AAD', // Blue
  [MTRLine.KTL]: '#00A651', // Green
  [MTRLine.DRL]: '#FF69B4'  // Pink
};

// Helper function to get line Chinese name
export function getLineNameTC(line: MTRLine): string {
  return MTR_LINE_NAMES_TC[line] ?? line;
}

// Helper function to get line color
export function getLineColor(line: MTRLine): string {
  return MTR_LINE_COLORS[line] ?? '#6B7280';
} 