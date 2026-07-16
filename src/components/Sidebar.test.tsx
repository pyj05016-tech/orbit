// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from './Sidebar';
import { useSatelliteStore } from '../store/satellites';
import { SEED_SATELLITES, SEED_GROUND_STATIONS } from '../lib/seed';
import { useGroundStationStore } from '../store/groundStations';

beforeEach(() => {
  localStorage.clear();
  useSatelliteStore.setState({ satellites: SEED_SATELLITES });
  useGroundStationStore.setState({ stations: SEED_GROUND_STATIONS });
});

describe('Sidebar', () => {
  it('시드 데이터(ISS + Seoul)가 렌더링된다', () => {
    render(<Sidebar />);
    expect(screen.getByText('ISS (ZARYA)')).toBeInTheDocument();
    expect(screen.getByText('Seoul')).toBeInTheDocument();
  });

  it('체크박스로 표시 여부를 토글한다', () => {
    render(<Sidebar />);
    const checkbox = screen.getByLabelText('ISS (ZARYA) 표시') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    fireEvent.click(checkbox);
    expect(useSatelliteStore.getState().satellites[0].visible).toBe(false);
  });
});
