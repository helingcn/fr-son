import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FaceConsentScreen } from '../screens/FaceConsentScreen';
import { FaceEnrollmentScreen } from '../screens/FaceEnrollmentScreen';
import { FaceVerificationScreen } from '../screens/FaceVerificationScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import type { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const status = useAuthStore(state => state.status);
  const registrationConsentAcceptedAt = useAuthStore(
    state => state.registrationConsentAcceptedAt,
  );

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
      }}
    >
      {status === 'signedIn' ? (
        <Stack.Group>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'X' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Ayarlar' }}
          />
          <Stack.Screen
            name="FaceConsent"
            component={FaceConsentScreen}
            options={{ title: 'Yüz ile giriş' }}
          />
          <Stack.Screen
            name="FaceEnrollment"
            component={FaceEnrollmentScreen}
            options={{ title: 'Yüz kaydı' }}
          />
        </Stack.Group>
      ) : status === 'pendingRegistrationFace' ? (
        <Stack.Group>
          <Stack.Screen
            name="FaceEnrollment"
            component={FaceEnrollmentScreen}
            initialParams={{
              mode: 'registration',
              consentVersion: 'demo-draft-v1',
              consentAcceptedAt: registrationConsentAcceptedAt ?? '',
            }}
            options={{
              headerBackVisible: false,
              title: 'Kayıt ol · 2/2',
            }}
          />
        </Stack.Group>
      ) : status === 'pendingFaceChoice' ? (
        <Stack.Group>
          <Stack.Screen
            name="FaceConsent"
            component={FaceConsentScreen}
            initialParams={{ mode: 'initial' }}
            options={{ headerBackVisible: false, title: 'Hızlı giriş' }}
          />
          <Stack.Screen
            name="FaceEnrollment"
            component={FaceEnrollmentScreen}
            options={{ title: 'Yüz kaydı' }}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'X' }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Kayıt ol' }}
          />
          <Stack.Screen
            name="FaceVerification"
            component={FaceVerificationScreen}
            options={{ title: 'Yüz ile giriş' }}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
