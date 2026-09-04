// 작성자가 가입 시 선택한 공개 표시 이름 — displayNickname && nickname이 있으면 닉네임,
// 아니면 실명. 크리에이터/퍼포머 이름이 공개적으로 노출되는 모든 곳(Discover, 트랙 상세,
// 알림 등)에서 이 함수를 통해서만 표시한다.
export function displayName(user: { name: string; nickname?: string | null; displayNickname: boolean }): string {
  if (user.displayNickname && user.nickname) return user.nickname;
  return user.name;
}
