const handleComplete = async () => {
  if (!nickname.trim()) {
    alert('닉네임을 입력해주세요')
    return
  }
  setLoading(true)
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase
      .from('user_taste_profile')
      .upsert({
        user_id: user.id,
        nickname: nickname.trim(),
        spice_level: spiceLevel,
        pickiness,
        style_pref: stylePref,
        preferred_cuisines: selectedCuisines,
      }, { onConflict: 'user_id' })

    if (error) {
      console.error('저장 오류:', error)
      alert('저장 오류: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/map')
  } catch (err) {
    console.error(err)
    setLoading(false)
  }
}
