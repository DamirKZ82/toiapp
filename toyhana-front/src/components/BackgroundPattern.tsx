import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { useThemeColors, useIsDark } from '@/theme/useThemeColors';

/**
 * Фоновый паттерн с тонкой современной интерпретацией казахских мотивов.
 *
 * Мотивы:
 *  - Ромб (негізгі ою) — базовая сетка
 *  - «Қошқар мүйіз» (бараний рог) — две встречные завитушки, стилизованные
 *
 * Ренд ерится единожды на экране, абсолютное позиционирование за контентом.
 * Opacity ~8% — едва видно, не отвлекает.
 */
export function BackgroundPattern() {
  const c = useThemeColors();
  const isDark = useIsDark();

  // Тёмный тёпло-коричневый для светлой темы, приглушенно-зелёный для тёмной
  const stroke = isDark ? '#4A6A55' : '#8B6B3A';

  // Размер тайла. Меньше = плотнее узор. 140 — хорошо для телефона.
  const size = 140;

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
            {/* Базовая сетка — тонкие ромбы */}
            <Path
              d={`M ${size / 2} 0 L ${size} ${size / 2} L ${size / 2} ${size} L 0 ${size / 2} Z`}
              stroke={stroke}
              strokeWidth={1.0}
              fill="none"
              opacity={0.7}
            />

            {/* Центральный мотив — стилизованный «қошқар мүйіз».
                Две симметричные дуги, как два рога барана навстречу. */}
            <Path
              d={`
                M ${size / 2 - 14} ${size / 2}
                C ${size / 2 - 14} ${size / 2 - 10}, ${size / 2 - 6} ${size / 2 - 14}, ${size / 2 - 2} ${size / 2 - 6}
                M ${size / 2 + 14} ${size / 2}
                C ${size / 2 + 14} ${size / 2 - 10}, ${size / 2 + 6} ${size / 2 - 14}, ${size / 2 + 2} ${size / 2 - 6}
              `}
              stroke={stroke}
              strokeWidth={1.5}
              strokeLinecap="round"
              fill="none"
            />

            {/* Маленький акцент-точка по центру */}
            <Path
              d={`M ${size / 2 - 1} ${size / 2 + 2} L ${size / 2 + 1} ${size / 2 + 2}`}
              stroke={stroke}
              strokeWidth={2.2}
              strokeLinecap="round"
            />

            {/* Угловые акценты */}
            <Path
              d={`
                M 0 0 L 0 0
                M ${size} 0 L ${size} 0
                M 0 ${size} L 0 ${size}
                M ${size} ${size} L ${size} ${size}
              `}
              stroke={stroke}
              strokeWidth={2.8}
              strokeLinecap="round"
            />
          </Pattern>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          fill="url(#kz-ornament)"
          opacity={0.18}
        />
      </Svg>
    </View>
  );
}
