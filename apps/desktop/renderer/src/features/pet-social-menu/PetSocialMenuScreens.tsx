import { useMemo, useState, type FormEvent } from 'react'
import {
  IconBell,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardList,
  IconCopy,
  IconDots,
  IconEye,
  IconEyeOff,
  IconInfoCircle,
  IconLogout,
  IconSettings,
  IconTarget,
  IconUsers,
  IconX
} from '@tabler/icons-react'
import { Button } from '../../components/Button'
import { PixelSurface } from '../../components/PixelSurface'
import {
  FRIEND_REQUESTS,
  FRIENDS,
  STATUS_CLASS_NAMES,
  type FriendFixture,
  type FriendRequestFixture,
  type PetMotion,
  resolvePetMotionAssetPath
} from './petSocialMenu.fixtures'
import styles from './PetSocialMenuScreens.module.css'

export type PetSocialScreenId =
  | '00-default-pet'
  | '02-friend-pet-strip'
  | '08-friends-management'
  | '18-quick-menu'

interface PetSocialMenuScreensProps {
  screenId: PetSocialScreenId
}

interface PetArtworkProps {
  alt: string
  className?: string
  motion?: PetMotion
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function PetArtwork({ alt, className, motion = 'IDLE' }: PetArtworkProps) {
  return (
    <img
      className={joinClassNames(styles.petArtwork, className, 'pixel-art')}
      src={resolvePetMotionAssetPath(motion)}
      alt={alt}
      data-pet-motion={motion}
    />
  )
}

function StatusLabel({ friend }: { friend: FriendFixture }) {
  return (
    <span className={joinClassNames(styles.statusLabel, styles[STATUS_CLASS_NAMES[friend.status]])}>
      <span aria-hidden="true" className={styles.statusDot} />
      {friend.safeLabel}
    </span>
  )
}

export function DefaultDesktopPetScreen() {
  const [isSelected, setIsSelected] = useState(false)

  return (
    <main
      className={joinClassNames(styles.overlayStage, styles.defaultPetStage)}
      data-ui-screen="00-default-pet"
      data-ui-state={isSelected ? 'selected' : 'idle'}
    >
      <button
        type="button"
        className={styles.desktopPetButton}
        aria-label="桌宠水豚"
        aria-pressed={isSelected}
        onClick={() => setIsSelected((current) => !current)}
      >
        <PetArtwork className={styles.defaultPet} alt="坐在电脑前工作的像素水豚" />
      </button>
    </main>
  )
}

const FRIENDS_PER_PAGE = 5

export function FriendPetStripScreen() {
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(FRIENDS.length / FRIENDS_PER_PAGE)
  const visibleFriends = FRIENDS.slice(page * FRIENDS_PER_PAGE, (page + 1) * FRIENDS_PER_PAGE)
  const firstFriendNumber = page * FRIENDS_PER_PAGE + 1
  const lastFriendNumber = Math.min((page + 1) * FRIENDS_PER_PAGE, FRIENDS.length)

  return (
    <main
      className={joinClassNames(styles.overlayStage, styles.friendStripStage)}
      data-ui-screen="02-friend-pet-strip"
      data-ui-state={`page-${page + 1}`}
    >
      <section className={styles.friendStrip} aria-label="好友排排坐">
        <div className={styles.friendSeats}>
          {visibleFriends.map((friend) => (
            <article className={styles.friendSeat} key={friend.id}>
              <PetArtwork
                className={styles.friendPet}
                motion={friend.status}
                alt={`${friend.displayName}的像素桌宠`}
              />
              <strong>{friend.isSelf ? '我 · ' : ''}{friend.safeLabel}</strong>
            </article>
          ))}
        </div>

        <nav className={styles.friendPager} aria-label="好友桌宠分页">
          <button
            type="button"
            aria-label="上一组好友"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            <IconChevronLeft size={24} stroke={2.2} aria-hidden="true" />
          </button>
          <span>好友 {firstFriendNumber}–{lastFriendNumber}/{FRIENDS.length}</span>
          <button
            type="button"
            aria-label="下一组好友"
            disabled={page === pageCount - 1}
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
          >
            <IconChevronRight size={24} stroke={2.2} aria-hidden="true" />
          </button>
        </nav>
      </section>
    </main>
  )
}

type FriendProjectionState = Record<string, boolean>

export function FriendsManagementScreen() {
  const displayedFriends = useMemo(() => FRIENDS.slice(0, 8), [])
  const acceptedFriends = useMemo(() => FRIENDS.filter((friend) => !friend.isSelf).slice(0, 7), [])
  const [selectedFriendId, setSelectedFriendId] = useState(acceptedFriends[0]?.id ?? '')
  const [openMenuFriendId, setOpenMenuFriendId] = useState<string | null>(null)
  const [projectionByFriend, setProjectionByFriend] = useState<FriendProjectionState>(() =>
    Object.fromEntries(acceptedFriends.map((friend) => [friend.id, true]))
  )
  const [requests, setRequests] = useState<FriendRequestFixture[]>(FRIEND_REQUESTS)
  const [friendCode, setFriendCode] = useState('')
  const [feedback, setFeedback] = useState('')

  const selectedFriend = acceptedFriends.find((friend) => friend.id === selectedFriendId)
  const selectedFriendReceivesProjection = selectedFriend
    ? projectionByFriend[selectedFriend.id] !== false
    : true

  function toggleProjection(friendId: string): void {
    setProjectionByFriend((current) => ({
      ...current,
      [friendId]: current[friendId] === false
    }))
    setOpenMenuFriendId(null)
  }

  function handleRequest(requestId: string, action: 'accept' | 'decline'): void {
    const request = requests.find((item) => item.id === requestId)
    setRequests((current) => current.filter((item) => item.id !== requestId))
    setFeedback(request ? `${request.displayName}的申请已${action === 'accept' ? '接受' : '拒绝'}` : '')
  }

  function handleFriendCodeSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    setFeedback(friendCode.trim() ? `已向 ${friendCode.trim()} 发送好友申请` : '请输入完整好友码')
    if (friendCode.trim()) {
      setFriendCode('')
    }
  }

  return (
    <main
      className={joinClassNames(styles.overlayStage, styles.managementStage)}
      data-ui-screen="08-friends-management"
      data-ui-state={selectedFriendReceivesProjection ? 'sharing-selected' : 'hidden-from-selected'}
    >
      <PixelSurface
        className={styles.friendsWindow}
        innerClassName={styles.friendsWindowInner}
        ariaLabel="好友管理"
      >
        <header className={styles.friendsHeader}>
          <IconUsers size={44} stroke={1.7} aria-hidden="true" />
          <div>
            <h1>好友</h1>
            <p>只有互相接受后，才能看到桌宠状态。</p>
          </div>
          <button type="button" className={styles.closeButton} aria-label="关闭好友管理">
            <IconX size={34} stroke={1.8} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.friendCodeCard}>
          <strong>我的好友码</strong>
          <span>C7P4-K8M2</span>
          <button type="button" aria-label="复制好友码" onClick={() => setFeedback('好友码已复制')}>
            <IconCopy size={19} stroke={1.8} aria-hidden="true" />
            复制
          </button>
        </div>

        <div className={styles.friendsGrid}>
          <section className={styles.friendListSection} aria-labelledby="friend-list-title">
            <h2 id="friend-list-title">我的好友 <span>{displayedFriends.length}</span></h2>
            <div className={styles.friendList}>
              {displayedFriends.map((friend) => {
                const receivesProjection = projectionByFriend[friend.id] !== false

                return (
                  <div
                    className={joinClassNames(
                      styles.friendRow,
                      selectedFriendId === friend.id ? styles.selectedFriendRow : undefined
                    )}
                    key={friend.id}
                  >
                    <button
                      type="button"
                      className={styles.friendIdentity}
                      aria-label={`选择好友${friend.displayName}`}
                      disabled={friend.isSelf}
                      onClick={() => !friend.isSelf && setSelectedFriendId(friend.id)}
                    >
                      <PetArtwork motion={friend.status} alt="" />
                      <strong>{friend.displayName}</strong>
                    </button>
                    {receivesProjection || friend.isSelf ? <StatusLabel friend={friend} /> : (
                      <span className={styles.hiddenProjectionLabel}>不对其展示</span>
                    )}
                    {friend.isSelf ? <span aria-hidden="true" /> : (
                      <button
                        type="button"
                        className={styles.rowMenuButton}
                        aria-label={`${friend.displayName}好友操作`}
                        aria-expanded={openMenuFriendId === friend.id}
                        onClick={() => {
                          setSelectedFriendId(friend.id)
                          setOpenMenuFriendId((current) => current === friend.id ? null : friend.id)
                        }}
                      >
                        <span className={styles.rowMenuTriggerIcon} aria-hidden="true">
                          <IconDots size={23} stroke={2} />
                        </span>
                        <IconChevronDown size={18} stroke={2} aria-hidden="true" />
                      </button>
                    )}
                    {!friend.isSelf && openMenuFriendId === friend.id ? (
                      <PixelSurface className={styles.rowMenu} innerClassName={styles.rowMenuInner}>
                        <button type="button" onClick={() => toggleProjection(friend.id)}>
                          {receivesProjection ? '不对其展示' : '恢复对其展示'}
                        </button>
                        <button type="button">删除好友</button>
                      </PixelSurface>
                    ) : null}
                  </div>
                )
              })}
            </div>

            <div className={styles.broadcastSummary}>
              <IconEye size={25} stroke={1.9} aria-hidden="true" />
              <span>我的活动广播：</span>
              <strong>已开启</strong>
            </div>
            <p className={styles.privacyNotice}>
              好友看不到你的任务、DDL、日薪、窝囊费或正在使用的应用。
            </p>
          </section>

          <section className={styles.friendActionsSection} aria-label="好友操作">
            <form className={styles.addFriendForm} onSubmit={handleFriendCodeSubmit}>
              <h2>添加好友</h2>
              <div>
                <input
                  aria-label="完整好友码"
                  placeholder="输入完整好友码"
                  value={friendCode}
                  onChange={(event) => setFriendCode(event.target.value)}
                />
                <Button variant="primary" type="submit">发送申请</Button>
              </div>
            </form>

            <div className={styles.requestSection}>
              <h2>收到的申请 <span>{requests.length}</span></h2>
              {requests.length > 0 ? requests.map((request) => (
                <div className={styles.requestRow} key={request.id}>
                  <PetArtwork alt="" />
                  <strong>{request.displayName}</strong>
                  <Button variant="primary" onClick={() => handleRequest(request.id, 'accept')}>接受</Button>
                  <Button onClick={() => handleRequest(request.id, 'decline')}>拒绝</Button>
                </div>
              )) : <p className={styles.emptyRequests}>暂无新的好友申请</p>}
            </div>

            <div className={styles.selectedFriendActions}>
              <p>
                <IconInfoCircle size={22} stroke={1.8} aria-hidden="true" />
                {selectedFriend
                  ? `${selectedFriend.displayName}${selectedFriendReceivesProjection ? '当前可以' : '当前不可以'}看到你的桌宠和活动状态。好友关系与对方到你的展示方向均保持不变。`
                  : '请选择好友。'}
              </p>
              <div>
                <Button>删除好友</Button>
                <Button
                  onClick={() => selectedFriend && toggleProjection(selectedFriend.id)}
                  disabled={!selectedFriend}
                >
                  {selectedFriendReceivesProjection ? (
                    <><IconEyeOff size={21} stroke={1.9} aria-hidden="true" />不对其展示</>
                  ) : (
                    <><IconEye size={21} stroke={1.9} aria-hidden="true" />恢复对其展示</>
                  )}
                </Button>
              </div>
            </div>

            <p className={styles.feedback} role="status">{feedback}</p>
          </section>
        </div>
      </PixelSurface>
    </main>
  )
}

export function QuickMenuScreen() {
  const [isPetVisible, setIsPetVisible] = useState(true)
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(true)
  const [shareActivityWithFriends, setShareActivityWithFriends] = useState(true)
  const [showFriendPetsOnDesktop, setShowFriendPetsOnDesktop] = useState(true)
  const [muteLabel, setMuteLabel] = useState('1小时')

  return (
    <main
      className={joinClassNames(styles.overlayStage, styles.quickMenuStage)}
      data-ui-screen="18-quick-menu"
      data-ui-state={isVisibilityMenuOpen ? 'visibility-submenu-open' : 'menu-only'}
    >
      <div className={styles.quickMenuCluster}>
        <PixelSurface className={styles.quickMenu} innerClassName={styles.quickMenuInner} ariaLabel="快捷菜单">
          <header className={styles.quickMenuHeader}>
            <PetArtwork motion="WORKING" alt="" />
            <strong>不要加班 · <span>专注中</span></strong>
          </header>

          <div className={styles.quickMenuItems}>
            <button type="button">
              <IconClipboardList size={25} stroke={1.8} aria-hidden="true" />
              打开今日任务
            </button>
            <button type="button" onClick={() => setIsPetVisible((current) => !current)}>
              {isPetVisible
                ? <IconEyeOff size={25} stroke={1.8} aria-hidden="true" />
                : <IconEye size={25} stroke={1.8} aria-hidden="true" />}
              {isPetVisible ? '隐藏桌宠' : '显示桌宠'}
            </button>
            <button
              type="button"
              className={isVisibilityMenuOpen ? styles.highlightedMenuItem : undefined}
              aria-expanded={isVisibilityMenuOpen}
              onClick={() => setIsVisibilityMenuOpen((current) => !current)}
            >
              <IconTarget size={25} stroke={1.8} aria-hidden="true" />
              桌宠可见范围
              <IconChevronRight size={24} stroke={2} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setMuteLabel((current) => current === '1小时' ? '关闭' : '1小时')}>
              <IconBell size={25} stroke={1.8} aria-hidden="true" />
              通知静音
              <span>{muteLabel}</span>
              <IconChevronRight size={24} stroke={2} aria-hidden="true" />
            </button>
            <button type="button">
              <IconSettings size={25} stroke={1.8} aria-hidden="true" />
              设置
              <IconChevronRight size={24} stroke={2} aria-hidden="true" />
            </button>
            <button type="button" className={styles.exitMenuItem}>
              <IconLogout size={25} stroke={1.9} aria-hidden="true" />
              退出应用
            </button>
          </div>

          <p className={styles.exitHint}>退出应用不会自动下班</p>
        </PixelSurface>

        {isVisibilityMenuOpen ? (
          <PixelSurface
            className={styles.visibilitySubmenu}
            innerClassName={styles.visibilitySubmenuInner}
            ariaLabel="桌宠可见范围"
          >
            <label>
              <input
                type="checkbox"
                checked={shareActivityWithFriends}
                onChange={(event) => setShareActivityWithFriends(event.target.checked)}
              />
              <span className={styles.pixelCheckbox} aria-hidden="true">
                {shareActivityWithFriends ? <IconCheck size={18} stroke={2.5} /> : null}
              </span>
              允许好友查看我的活动状态
            </label>
            <label>
              <input
                type="checkbox"
                checked={showFriendPetsOnDesktop}
                onChange={(event) => setShowFriendPetsOnDesktop(event.target.checked)}
              />
              <span className={styles.pixelCheckbox} aria-hidden="true">
                {showFriendPetsOnDesktop ? <IconCheck size={18} stroke={2.5} /> : null}
              </span>
              在桌面显示好友桌宠
            </label>
          </PixelSurface>
        ) : null}
      </div>

      {isPetVisible ? (
        <div className={styles.quickMenuPetArea}>
          <PixelSurface className={styles.taskBubble} innerClassName={styles.taskBubbleInner}>
            <span aria-hidden="true" className={styles.taskDot} />
            写方案 · 36分钟
          </PixelSurface>
          <PetArtwork
            className={styles.quickMenuPet}
            motion="WORKING"
            alt="坐在电脑前工作的像素水豚"
          />
        </div>
      ) : null}
    </main>
  )
}

export function PetSocialMenuScreens({ screenId }: PetSocialMenuScreensProps) {
  switch (screenId) {
    case '00-default-pet':
      return <DefaultDesktopPetScreen />
    case '02-friend-pet-strip':
      return <FriendPetStripScreen />
    case '08-friends-management':
      return <FriendsManagementScreen />
    case '18-quick-menu':
      return <QuickMenuScreen />
  }
}
