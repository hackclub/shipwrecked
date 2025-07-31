'use client';

import {Polyline} from 'react-leaflet/Polyline';
import {PathConfig} from '@/lib/map-theme';

export default function MapPath({pathConfig, positions}: { pathConfig: PathConfig, positions: L.LatLng[] }) {
  return (
    <Polyline pathOptions={{
      color: pathConfig.color,
      weight: pathConfig.weight,
      opacity: pathConfig.opacity,
      dashArray: pathConfig.dashArray,
      lineCap: pathConfig.lineCap
    }} positions={positions}
    />
  );
}