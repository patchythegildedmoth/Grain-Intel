export interface EntityLocation {
  entity: string;
  lat: number;
  lon: number;
  address: string;
  geocodedAt: string;
}

export interface ElevatorLocation {
  lat: number;
  lon: number;
  name: string;
}
