# iPhone에서 실행하기

이 앱은 iOS를 지원하는 Expo 앱입니다. iPhone은 개발 컴퓨터의 `localhost`에 접근할 수 없으므로, `.env`에 공개 HTTPS API 주소를 설정해야 합니다.

```sh
cp .env.example .env
# .env의 EXPO_PUBLIC_API_URL을 실제 서버 주소로 바꾸기
npx expo start --tunnel
```

표시된 QR 코드를 iPhone의 Expo Go 앱으로 열면 테스트할 수 있습니다. 같은 Wi-Fi를 쓰고 있다면 `npx expo start`만 사용해도 됩니다.

설치 가능한 iPhone 앱 빌드는 Apple 개발자 계정과 Expo EAS 로그인이 필요합니다.

```sh
npx eas login
npx eas build --platform ios --profile preview
```

`com.minesp.tracker`는 iOS 번들 ID로 등록되어 있습니다. 이미 사용하는 Apple 앱 ID가 있다면 `app.json`의 `ios.bundleIdentifier`를 그 값으로 바꾼 뒤 빌드하세요. 푸시 알림도 사용하려면 EAS 프로젝트를 만든 다음, 발급된 프로젝트 ID를 `.env`의 `EXPO_PUBLIC_EAS_PROJECT_ID`에 설정해야 합니다.
