import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenPlaceholder } from '../components/ScreenPlaceholder';
import { useAuthStore } from '../store/authStore';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const user = useAuthStore(state => state.user);
  const fullName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : undefined;

  return (
    <ScreenPlaceholder
      title="Başarıyla giriş yapıldı"
      description={
        fullName
          ? `Hoş geldiniz, ${fullName}.`
          : user?.email
          ? `${user.email} hesabıyla giriş yaptınız.`
          : 'Giriş sonrası içerik için yer tutucu.'
      }
    >
      <PrimaryButton
        label="Ayarlar"
        onPress={() => navigation.navigate('Settings')}
      />
    </ScreenPlaceholder>
  );
}
