import { ColorValue, Image, StyleSheet, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export const TabBarIcon = (props: {
  name: 'home' | 'focus' | 'history' | 'reward' | 'settings';
  color: ColorValue;
}) => {
  if (props.name === 'reward') {
    // 보상 탭은 채워진 별 아이콘(스프라이트와 같은 굵은 채움 스타일).
    return <FontAwesome name="star" size={22} color={props.color as string} />;
  }
  const offset = iconOffsets[props.name];

  return (
    <View style={styles.clip}>
      <Image
        source={require('../assets/navigation/gnb-icons.webp')}
        style={[
          styles.sprite,
          {
            tintColor: props.color,
            transform: [{ translateX: offset[0] }, { translateY: offset[1] }],
          },
        ]}
      />
    </View>
  );
};

const iconOffsets = {
  home: [0, 0],
  focus: [-26, 0],
  history: [0, -26],
  settings: [-26, -26],
} as const;

export const styles = StyleSheet.create({
  clip: {
    width: 26,
    height: 26,
    overflow: 'hidden',
  },
  sprite: {
    width: 52,
    height: 52,
  },
});
