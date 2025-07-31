'use client';

import {Popup} from 'react-leaflet';
import Marker from '@/components/map/Marker';
import {latLng} from 'leaflet';
import {MapTheme} from '@/lib/map-theme';

const coordinates = latLng(42.314133, -71.010265);

export default function ShipwreckedPOI({theme}: { theme: MapTheme }) {
  return (
    <Marker iconConfig={theme.icons.shipwreckedPOI} iconState={{}} markerPosition={coordinates} zIndex={1000}>
      <Popup>
        <h2 className="text-lg font-semibold my-2">Cathleen Stone Island</h2>
        <img src="/logo-outline.svg" alt="Shipwrecked Logo" className="mb-2"/>
      </Popup>
    </Marker>
  );
}