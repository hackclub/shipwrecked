'use client';

import {Marker as LeafletMarker} from 'react-leaflet/Marker';
import {LatLng} from 'leaflet';
import {IconConfig} from '@/lib/map-theme';
import {IconState, makeIcon} from '@/lib/map-drawing';
import {forwardRef, ReactNode, useEffect, useRef} from 'react';

import 'leaflet-rotatedmarker';

const RotatedMarker = forwardRef(({children, ...props}, forwardRef) => {
  const markerRef = useRef();

  const {rotationAngle, rotationOrigin} = props;
  useEffect(() => {
    const marker = markerRef.current;
    if (marker) {
      marker.setRotationAngle(rotationAngle);
      marker.setRotationOrigin(rotationOrigin);
    }
  }, [rotationAngle, rotationOrigin]);

  return (
    <LeafletMarker
      ref={(ref) => {
        markerRef.current = ref;
        if (forwardRef) {
          forwardRef.current = ref;
        }
      }}
      {...props}
    >
      {children}
    </LeafletMarker>
  );
});

export default function Marker({iconConfig, iconState, markerPosition, children, zIndex}: {
  iconConfig: IconConfig,
  iconState: IconState,
  markerPosition: LatLng,
  children?: ReactNode,
  zIndex?: number
}) {
  let rotation = ((iconConfig.rotate || 0) + (iconState.rotate || 0) + 360) % 360;
  let flip = false;
  if (rotation > 90 && rotation < 270) {
    flip = true;
    rotation = (rotation + 180) % 360; // Adjust rotation for flipped icon
  }
  return (
    <RotatedMarker icon={makeIcon(iconConfig, iconState, flip)} position={markerPosition} rotationOrigin="center center"
                   rotationAngle={rotation} zIndexOffset={zIndex || 0}>
      {children}
    </RotatedMarker>
  );
}