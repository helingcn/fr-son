import { StyleSheet, View } from 'react-native';

export function BrandBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.topGlow} />
      <View style={styles.sideGlow} />
      <View style={styles.bottomGlow} />
    </View>
  );
}

const styles = StyleSheet.create({
  topGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    top: -190,
    right: -130,
    borderRadius: 180,
    backgroundColor: 'rgba(21, 94, 239, 0.10)',
  },
  sideGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    top: '36%',
    left: -180,
    borderRadius: 125,
    backgroundColor: 'rgba(46, 144, 250, 0.08)',
  },
  bottomGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    right: -210,
    bottom: -170,
    borderRadius: 160,
    backgroundColor: 'rgba(97, 114, 243, 0.08)',
  },
});
