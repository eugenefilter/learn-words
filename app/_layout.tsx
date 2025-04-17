import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { getDB } from '../database/database';

import "../global.css"

export default function Layout() {
  useEffect(() => {
    // Инициализируем базу данных при запуске приложения
    getDB();
  }, []);

  return <Stack />;
}
