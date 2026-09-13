import { ColorValue, Image, StyleSheet, View } from 'react-native';

export const TabBarIcon = (props: {
  name: 'home' | 'focus' | 'history' | 'settings';
  color: ColorValue;
}) => {
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
