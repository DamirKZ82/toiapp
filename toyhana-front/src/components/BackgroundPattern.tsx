import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { useThemeColors, useIsDark } from '@/theme/useThemeColors';

/**
 * Фоновый паттерн с казахским орнаментом.
 *
 * Мотив — стилизованная комбинация:
 *  - «Қошқар мүйіз» (бараний рог) — парные симметричные спирали
 *  - «Қанатты» (крылатый) — острые треугольные завершения по бокам
 *
 * Элемент строится симметрично по обеим осям и плотно тайлится.
 * Низкая opacity (~0.14) — видно, но не мешает.
 */
export function BackgroundPattern() {
  const c = useThemeColors();
  const isDark = useIsDark();

  // Тёмно-охристый для светлой темы, мягко-зелёный для тёмной
  const stroke = isDark ? '#4A6A55' : '#7A5A2E';
  const fill = stroke;

  // Тайл
  const size = 160;

  // Центр тайла
  const cx = size / 2;
  const cy = size / 2;

  // Главный мотив — в центре тайла. Вокруг — узкая сетка (углы).
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id="kz-ornament"
            patternUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={size}
            height={size}
          >
            {/* ============================================================
                ГЛАВНЫЙ ЭЛЕМЕНТ — парные завитки «қошқар мүйіз» навстречу
                ============================================================
                Состоит из 4 зеркальных спиралей (рогов), сходящихся в центре.
                Каждая спираль начинается от центральной оси и закручивается
                наружу и вниз/вверх. */}

            {/* Верхняя пара рогов (слева и справа, расходятся от центра вверх) */}
            {/* Левый рог */}
            <Path
              d={`
                M ${cx} ${cy - 4}
                C ${cx - 8} ${cy - 8}, ${cx - 20} ${cy - 14}, ${cx - 22} ${cy - 4}
                C ${cx - 24} ${cy + 4}, ${cx - 18} ${cy + 6}, ${cx - 14} ${cy + 2}
                C ${cx - 12} ${cy - 2}, ${cx - 14} ${cy - 6}, ${cx - 18} ${cy - 4}
              `}
              fill={fill}
              fillOpacity={0.55}
            />
            {/* Правый рог (зеркально) */}
            <Path
              d={`
                M ${cx} ${cy - 4}
                C ${cx + 8} ${cy - 8}, ${cx + 20} ${cy - 14}, ${cx + 22} ${cy - 4}
                C ${cx + 24} ${cy + 4}, ${cx + 18} ${cy + 6}, ${cx + 14} ${cy + 2}
                C ${cx + 12} ${cy - 2}, ${cx + 14} ${cy - 6}, ${cx + 18} ${cy - 4}
              `}
              fill={fill}
              fillOpacity={0.55}
            />

            {/* Нижняя пара рогов — зеркально, опущенные вниз */}
            <Path
              d={`
                M ${cx} ${cy + 4}
                C ${cx - 8} ${cy + 8}, ${cx - 20} ${cy + 14}, ${cx - 22} ${cy + 4}
                C ${cx - 24} ${cy - 4}, ${cx - 18} ${cy - 6}, ${cx - 14} ${cy - 2}
                C ${cx - 12} ${cy + 2}, ${cx - 14} ${cy + 6}, ${cx - 18} ${cy + 4}
              `}
              fill={fill}
              fillOpacity={0.55}
            />
            <Path
              d={`
                M ${cx} ${cy + 4}
                C ${cx + 8} ${cy + 8}, ${cx + 20} ${cy + 14}, ${cx + 22} ${cy + 4}
                C ${cx + 24} ${cy - 4}, ${cx + 18} ${cy - 6}, ${cx + 14} ${cy - 2}
                C ${cx + 12} ${cy + 2}, ${cx + 14} ${cy + 6}, ${cx + 18} ${cy + 4}
              `}
              fill={fill}
              fillOpacity={0.55}
            />

            {/* Центральная точка — связывает всё вместе */}
            <Path
              d={`M ${cx - 2.5} ${cy} a 2.5 2.5 0 1 0 5 0 a 2.5 2.5 0 1 0 -5 0`}
              fill={fill}
              fillOpacity={0.7}
            />

            {/* ============================================================
                БОКОВЫЕ «КОПЬЯ» — острые треугольные выступы по 4 сторонам
                ============================================================
                Создают ощущение креста/розетки вокруг центра */}

            {/* Сверху */}
            <Path
              d={`
                M ${cx} ${cy - 28}
                L ${cx - 4} ${cy - 20}
                L ${cx + 4} ${cy - 20}
                Z
              `}
              fill={fill}
              fillOpacity={0.6}
            />
            {/* Снизу */}
            <Path
              d={`
                M ${cx} ${cy + 28}
                L ${cx - 4} ${cy + 20}
                L ${cx + 4} ${cy + 20}
                Z
              `}
              fill={fill}
              fillOpacity={0.6}
            />
            {/* Слева */}
            <Path
              d={`
                M ${cx - 34} ${cy}
                L ${cx - 26} ${cy - 3}
                L ${cx - 26} ${cy + 3}
                Z
              `}
              fill={fill}
              fillOpacity={0.6}
            />
            {/* Справа */}
            <Path
              d={`
                M ${cx + 34} ${cy}
                L ${cx + 26} ${cy - 3}
                L ${cx + 26} ${cy + 3}
                Z
              `}
              fill={fill}
              fillOpacity={0.6}
            />

            {/* ============================================================
                УГЛОВЫЕ МИНИ-ЗАВИТКИ — заполняют пустое пространство тайла,
                создают ритм при повторении */}

            {[
              [0, 0, 1, 1],
              [size, 0, -1, 1],
              [0, size, 1, -1],
              [size, size, -1, -1],
            ].map(([ox, oy, sx, sy], i) => (
              <Path
                key={i}
                d={`
                  M ${ox + sx * 10} ${oy + sy * 14}
                  C ${ox + sx * 12} ${oy + sy * 6}, ${ox + sx * 16} ${oy + sy * 10}, ${ox + sx * 14} ${oy + sy * 14}
                  C ${ox + sx * 12} ${oy + sy * 16}, ${ox + sx * 10} ${oy + sy * 14}, ${ox + sx * 10} ${oy + sy * 14}
                `}
                fill={fill}
                fillOpacity={0.55}
              />
            ))}
          </Pattern>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill="url(#kz-ornament)"
          opacity={0.14}
        />
      </Svg>
    </View>
  );
}
